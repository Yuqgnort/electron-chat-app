import { Check, CheckCheck, ChevronRight, RefreshCcw } from "lucide-react";

export const getStatusIcon = (
  status: string,
  defaultProperty = { width: 12, height: 12 }
) => {
  switch (status) {
    case "sent":
      return <ChevronRight {...defaultProperty} />;
    case "delivered":
      return <Check {...defaultProperty} />;
    case "read":
      return <CheckCheck {...defaultProperty} />;
    default:
      return <RefreshCcw {...defaultProperty} />;
  }
};

export const formatTime = (mls: number) => {
  const date = new Date(mls);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

class MinHeap<T> {
  private data: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  push(item: T) {
    this.data.push(item);
    this.bubbleUp();
  }

  pop(): T | null {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const end = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = end;
      this.bubbleDown();
    }
    return top;
  }

  isEmpty(): boolean {
    return this.data.length === 0;
  }

  private bubbleUp() {
    let idx = this.data.length - 1;
    const item = this.data[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.data[parentIdx];
      if (this.compare(item, parent) >= 0) break;
      this.data[idx] = parent;
      idx = parentIdx;
    }
    this.data[idx] = item;
  }

  private bubbleDown() {
    let idx = 0;
    const length = this.data.length;
    const item = this.data[0];
    while (true) {
      let leftIdx = 2 * idx + 1;
      let rightIdx = 2 * idx + 2;
      let smallest = idx;

      if (
        leftIdx < length &&
        this.compare(this.data[leftIdx], this.data[smallest]) < 0
      ) {
        smallest = leftIdx;
      }
      if (
        rightIdx < length &&
        this.compare(this.data[rightIdx], this.data[smallest]) < 0
      ) {
        smallest = rightIdx;
      }
      if (smallest === idx) break;

      this.data[idx] = this.data[smallest];
      idx = smallest;
    }
    this.data[idx] = item;
  }
}

interface HeapNode<T> {
  value: T;
  arrayIndex: number;
  elementIndex: number;
}

export function mergeKSortedArrays<T>({
  arrays,
  compareFn,
}: {
  arrays?: T[][];
  compareFn: (a: T, b: T) => number;
}): T[] {
  if (!arrays || arrays.length === 0) return [];
  const result: T[] = [];
  const heap = new MinHeap<HeapNode<T>>((a, b) => compareFn(a.value, b.value));

  arrays.forEach((arr, i) => {
    if (arr.length > 0) {
      heap.push({ value: arr[0], arrayIndex: i, elementIndex: 0 });
    }
  });

  while (!heap.isEmpty()) {
    const node = heap.pop()!;
    result.push(node.value);

    const { arrayIndex, elementIndex } = node;
    const nextIndex = elementIndex + 1;
    if (nextIndex < arrays[arrayIndex].length) {
      heap.push({
        value: arrays[arrayIndex][nextIndex],
        arrayIndex,
        elementIndex: nextIndex,
      });
    }
  }

  return result;
}
