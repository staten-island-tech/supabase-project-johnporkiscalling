import * as THREE from 'three';
export class Random {
    private lcgState: number;
    constructor(seed: number) {
        this.lcgState = seed;
    }
    lcg() {
        this.lcgState = (this.lcgState * 1664525 + 1013904223) >>> 0;
        return this.lcgState;
    }
}
export class WorkerPool {
    private workers: Worker[] = [];
    private idleWorkers: Worker[] = [];
    private pendingTasks: Array<() => void> = [];
    private workerScript: URL;
    private maxWorkers: number;

    constructor(workerScript: URL, maxWorkers: number) {
        this.workerScript = workerScript;
        this.maxWorkers = maxWorkers;
    }

async runTask<T>(message: any): Promise<T> {
    const worker = await this.getIdleWorker();
    console.log("worker was assigned");

    return new Promise<T>((resolve, reject) => {
        const handleMessage = (e: MessageEvent<T>) => {
            console.log("worker sent a message");
            cleanup();
            this.returnWorker(worker);
            resolve(e.data);
        };

        const handleError = (e: ErrorEvent) => {
            console.error("worker error", e);
            cleanup();
            this.workers = this.workers.filter(w => w !== worker);
            worker.terminate();
            reject(e);
        };

        const cleanup = () => {
            worker.onmessage = null;
            worker.onerror = null;
        };

        // Set handlers BEFORE sending message
        worker.onmessage = handleMessage;
        worker.onerror = handleError;

        console.log('worker posting message');
        worker.postMessage(message);
    });
}


    async getIdleWorker(): Promise<Worker> {
        if (this.idleWorkers.length > 0) {//return first available worker
            return this.idleWorkers.pop()!;
        }
        if (this.workers.length < this.maxWorkers) {//no worker then create worker
            const worker = new Worker(this.workerScript, { type: 'module' });
            this.workers.push(worker);
            return worker;
        }
        return new Promise<Worker>(resolve => {//if problem isnt no worker wait for a new worker to become available 
            this.pendingTasks.push(() => {
                resolve(this.idleWorkers.pop()!);
            });
        });
    }

    returnWorker(worker: Worker): void {
        this.idleWorkers.push(worker);
        const nextTask = this.pendingTasks.shift();
        if (nextTask) {
            nextTask();
        }
    }
    terminateAll(): void {//destroy the workers when task has been done
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        this.idleWorkers = [];
    }
}
export class UniversalIntArray
{
    size:number;
    bits:number;
    array:Uint16Array;
    entries:number
    constructor(size:number, bits:number)
    {
        this.size =  size;
        this.bits = bits;
        const bitTotal = size*bits;
        const arraySize = (16/bitTotal);
        this.array = new Uint16Array(arraySize);
        this.entries = Math.floor(16/size);
    }
    get(index:number)
    {
        const wordIndex = Math.floor(index/this.entries);
        const bitOffset = (index % this.entries) * this.entries;
        const word = this.array[wordIndex];
        return (word >>> bitOffset) & ((1 << this.entries) -1 );
    }
    set(index:number, value:number)
    {
        const wordIndex = Math.floor(index/this.entries);
        const bitOffset = (index % this.entries) * this.entries;
        const word = this.array[wordIndex];
        const mask  = ((1 << this.entries) -1 ) << bitOffset;
        this.array[wordIndex] = (this.array[wordIndex] & ~mask) | ((value << bitOffset) & mask)
    }
}
const textureLoader = new THREE.TextureLoader();
export const util = Object.freeze(
    {
        loadBlockTexture(path: string) {
            const tex = textureLoader.load(path);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = true;
            tex.premultiplyAlpha = false;
            return tex;
        },
        localizeCords: function (wX: number, wY: number, wZ: number) {
            const cX = Math.floor(wX / 16);
            const cY = Math.floor(wY / 16);
            const cZ = Math.floor(wZ / 16);
            const cCords = [cX, cY, cZ];

            const lX = ((wX % 16) + 16) % 16;
            const lY = ((wY % 16) + 16) % 16;
            const lZ = ((wZ % 16) + 16) % 16;
            const lCords = [lX, lY, lZ];

            return { cCords, lCords };
        },
        clamp(min:number, max:number, value:number)
        {
            return Math.max(min, Math.min(max, value))
        },
        getIndex(x: number, y: number, z: number)  
        {
            return x + 16 * (y + 16 * z)
        },
            lerp: function (a: number, b: number, t: number)//t must be between 0-1;
        {
            return a * (1 - t) + b * t;
        },
        fade: function (t: number)//limit =  0 to 1;
        {
            return t * t * t * (t * (t * 6 - 15) + 10);
        },
        dot: function (a: Array<number>, b: Array<number>) {
            return a[0] * b[0] + a[1] * b[1];
        },
        roundTo: function (number: number, decimal: number) {
            const place = 10 ** decimal;
            return Math.round(number * place) / place;
        }
    }
)
