import {Emitter, stream, Stream} from 'kefir';
import {filter, forEach} from "ramda";

type Callback<Model> = (m: Model) => void;

export interface SendFunc<Command> {
    (cmd:Command): void;
}

export interface UpdateFunc<Command, Model> {
    (x: Model, send: SendFunc<Command>, cmd: Command) : Model | void;
} 

class Handler<Command,Model> {
    public readonly modelStream: Stream<Model,never>;
    private model : Model;
    private emitter : Emitter<Command,never>;
    private modelEmitter : Emitter<Model,never>;
    private observers: Array<Callback<Model>> = [];

    constructor(
        initialModel: Model, 
        update: UpdateFunc<Command, Model>,         
        debounce: number = 25) {
        
        this.model = initialModel;

        const commandStream = stream<Command,never>((e: Emitter<Command,never>) => { this.emitter = e; }).delay(1);
        this.modelStream = stream<Model,never>((e: Emitter<Model,never>) => {this.modelEmitter = e;});
        if (debounce > 0)
            this.modelStream = this.modelStream.debounce(debounce);

        this.modelStream.onValue((model: Model) => forEach(observer => observer(model), this.observers));

        commandStream.onValue((cmd: Command) => {
            const result = update(this.model, this.send, cmd);
            if(result) {
                this.model = result;
                this.modelEmitter.emit(this.model);
            }
        });

        this.modelEmitter.emit(initialModel);
    }

    public addObserver = (f: Callback<Model>) => this.observers.push(f);

    public removeObserver = (f: Callback<Model>) => this.observers = filter(cb => cb !== f, this.observers);

    public send = (cmd: any) => this.emitter.emit(cmd);
}

export default Handler