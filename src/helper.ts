export async function timeout(time: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(null), time);
    });
}

export async function randomTimeout(from: number, to: number): Promise<void> {
    const time = Math.random() * (to - from) + from;
    return timeout(time);
}
