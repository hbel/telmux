import Handler from "../Handler";

class DummyModel {
    constructor(n: number) { this.value = n}
    public value: number = 0;
}

type Command = string;

function dummyUpdate(m: DummyModel, send: (cmd: string) => void, cmd: string): DummyModel | void {
    switch(cmd) {
        case "reset": return {value: 0};
        case "+": return {value: m.value + 1};
        case "-": return {value: m.value - 1};
        case "send": send("reset");
        default: return;
    }
}

describe("A handler", () => {
    it("accepts a generic updater function and model", () => {
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate)
        expect(handler).toBeDefined();
    });
    it("allows to send new commands to the update function", (done) => {
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate)
        handler.send("+");
        handler.modelStream.onValue( v => { expect(v.value).toBe(2); done() });
    });
    it("changes the model if the update function returns a new object", (done) => {
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate, 0)
        handler.send("+");
        handler.send("+");
        handler.send("-");
        handler.send("-");
        handler.send("-");
        handler.modelStream.skip(4).onValue( v => {
            expect(v.value).toBe(0); done();
        });
    });
    it("does not change the model if the update function returns nothing", (done) => {
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate, 0)
        handler.send("");
        let called = 0;
        handler.modelStream.onValue((v) => {
           throw "Error"; 
        });
        setTimeout(() => done(), 1000);
    });
    it("should provide a new model to all observers when the data changes", (done) => {
        const cb = (m: DummyModel) => done();
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate)
        handler.addObserver(cb)
        handler.send("+");        
    });
    it("does not inform removed observers", (done) => {
        const cb = (m: DummyModel) => {throw "error"};
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate)
        handler.addObserver(cb)
        handler.removeObserver(cb)
        handler.send("+");    
        setTimeout(() => done(), 1000);
    });
    it("respects the debounce parameter and sends out new models accordingly", (done) => {
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate, 250)
        handler.send("+");
        handler.send("+");
        handler.send("+");
        handler.modelStream.onValue( v => {expect(v.value).toBe(4); done();});
    });
    it("given no debounce value, a stream with debounce of 25ms should be created", () => {
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate);
        expect((handler.modelStream as any)._name).toBe("stream.debounce");
        expect((handler.modelStream as any)._wait).toBe(25);
    });
    it("using a debounce value of 0 should lead to a stream without debounce", () => {
        const handler = new Handler<Command,DummyModel>(new DummyModel(1), dummyUpdate, 0);
        expect((handler.modelStream as any)._name).not.toBe("stream.debounce");
        expect((handler.modelStream as any)._wait).toBeFalsy();
    });
});
