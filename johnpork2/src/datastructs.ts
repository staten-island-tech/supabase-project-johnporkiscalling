interface Node 
{
    parent:Array<number>
    coordinate:Array<number>
    h:number
    g:number
    f:number
}

export class BinaryHeap
{
    heap:Array<Node>;
    constructor()
    {
        this.heap = []
    }
    heapadd(i:Node)
    {
        this.heap.push(i);
        let currentIndex =  this.heap.length-1;
        if(currentIndex==0)
        {
            return;
        }
        console.log(this.parent(currentIndex), this.heap[currentIndex].f)
        while(this.parent(currentIndex)&&this.parent(currentIndex).f>this.heap[currentIndex].f)
        {
            const parentIndex =  Math.floor((currentIndex-1)/2);
            this.swap(currentIndex, parentIndex);
            currentIndex =  parentIndex;
        }
    }
    getRoot()
    {
        if(this.heap.length===0){return null}
        this.swap(0,this.heap.length-1);
        const root = this.heap.pop()
        this.heapify();
        return root;
    }
    heapify()
    {
        let current = 0;
        while(true)
        {
            let smallest = current;
            const leftIndex =  2*current+1;
            const rightIndex =  2*current+2;


            if(this.left(current)&&this.heap[leftIndex].f < this.heap[smallest].f)
            {
                smallest = leftIndex;
            }
            if(this.right(current)&&this.heap[rightIndex].f < this.heap[smallest].f)
            {
                smallest = rightIndex;
            }
            if(smallest!==current)
            {
                this.swap(current, smallest);
                current=smallest;
            }
            else
            {
                break;
            }

        }
    }
    swap(a:number,b:number)
    {
        [this.heap[a], this.heap[b]] =  [this.heap[b], this.heap[a]];
    }
    left(i:number)
    {
        return this.heap[2*i+1];
    }
    right(i:number)
    {
        return this.heap[2*i+2];
    }
    parent(i:number)
    {
        return this.heap[Math.floor((i-1)/2)];
    }
    length()
    {
        return this.heap.length;
    }

};