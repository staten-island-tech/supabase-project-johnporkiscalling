export class InputManager
{
    keys:Record<string, boolean> = {}
    mouseDown:Array<number> = [];
    duration:Array<number> = [];
    constructor()
    {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }
    onKeyDown(event:KeyboardEvent)
    {
        this.keys[event.key.toLowerCase()] = true;
    }
    onKeyUp(event:KeyboardEvent)
    {
        this.keys[event.key.toLowerCase()] = false;
    }
    dispose() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }
    pressed(key:string)
    {
        return !!this.keys[key];
    }
}