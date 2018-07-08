import { stream } from 'kefir';
import { filter, forEach } from "ramda";
class Handler {
    constructor(initialModel, update, debounce = 25) {
        this.observers = [];
        this.addObserver = (f) => this.observers.push(f);
        this.removeObserver = (f) => this.observers = filter(cb => cb !== f, this.observers);
        this.send = (cmd) => this.emitter.emit(cmd);
        this.model = initialModel;
        const commandStream = stream((e) => { this.emitter = e; }).delay(1);
        this.modelStream = stream((e) => { this.modelEmitter = e; }).debounce(debounce);
        this.modelStream.onValue((model) => forEach(observer => observer(model), this.observers));
        commandStream.onValue((cmd) => {
            const result = update(this.model, this.send, cmd);
            if (result) {
                this.model = result;
                this.modelEmitter.emit(this.model);
            }
        });
        this.modelEmitter.emit(initialModel);
    }
}
export default Handler;
//# sourceMappingURL=lib/src/Handler.js.map