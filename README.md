# telmux

[![Build Status](https://travis-ci.org/hbel/telmux.svg?branch=master)](https://travis-ci.org/hbel/telmux)

[![NPM](https://nodei.co/npm/telmux.png)](https://npmjs.org/package/telmux)

Highly opiniated state management for TypeScript apps.

## Introduction

Telmux is a very small reactive state management library that's heavily influenced by the ELM architecture. _State_ is
changed via _Commands_ that are issued to the command stream of the _Handler_. It is upon you to provide the handler with
an _update_ function that is responsible for interpreting commands, providing updated state in a pure manner. Side-effects
can be achieved by commands that don't change state, but run side-effects.

Telmux is agnostic about the Frontend framework you're using. It has been tested successfully with *React* and *Vue* and can provide
a suitable and typesafe alternative to Redux or Vuex.

## Usage

To implemented commands, it is recommened to use some kind of _sum type_. We suggest using the excellent [Unionize](https://github.com/pelotom/unionize) library for that.

In the following code segment, we define our commands for a simple stopwatch application:

``` typescript
interface Time { minutes: number; seconds: number }

export const StopWatchCommands = unionize({
    Pause: {},
    Reset: ofType<Time>(),
    Start: {},
    Tick: {}
}, {value: "payload"});

export type StopWatchCommand = UnionOf<typeof StopWatchCommands>
```

To interpret these commands, an _update_-function is defined. We decide to make the stopwatch automatically go on pause as soon as
it reaches 00:00 :
``` typescript
export const update = (model: Readonly<StopWatch>, send: (cmd:StopWatchCommand) => void, cmd: StopWatchCommand): StopWatch | void => 
StopWatchCommands.match(cmd, {
    Pause: () => ({...model, started: false}),
    Reset: (time: Time) => ({...model, minutes: time.minutes, seconds: time.seconds}),
    Start: () => ({...model, started: true}),
    Tick: () => {
        const seconds = model.seconds - 1 >= 0 ? model.seconds -1 : 59;    
        const minutes = model.seconds - 1 >= 0 ? model.minutes : model.minutes - 1;
        if ( seconds === 0 && minutes <= 0 ) { 
            send(StopWatchCommands.Pause()); 
        }
        return {seconds, minutes: minutes < 0 ? 0 : minutes, started: true};
    }
});
```

To issue commands, it is possible to extend the original handler class
``` typescript
export class StopWatchHandler extends Handler<StopWatchCommand, StopWatch> {
    private tickStream = interval( 1000, true );

    constructor(initialState: StopWatch) {
        super(initialState, update);
    }

    public start = () => {
        this.tickStream.onValue( this.tick );
        this.send(StopWatchCommands.Start());
    }

    public stop = () => {
        this.tickStream.offValue( this.tick );
        this.send(StopWatchCommands.Pause());
        this.send(StopWatchCommands.Reset({minutes: 1, seconds: 0}));
    }

    public pause = () => {
        this.tickStream.offValue( this.tick );
        this.send(StopWatchCommands.Pause());
    }

    private tick = (_: boolean) => this.send(StopWatchCommands.Tick());
}
```

You can use this class as a member in your frontend component. To couple your state with the component's state, it is possible to
observe a stream of changing models (as shown here for react):

``` typescript
class App extends React.Component<{},StopWatch> {

  private handler : StopWatchHandler;
  constructor(props: any)
  {
    super(props);
    this.state = {minutes: 2, seconds: 0, started: false};
    this.handler = new StopWatchHandler(this.state);
    this.handler.modelStream.onValue( model => this.setState(model) );
  }
}
```
