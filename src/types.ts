export type MessageHandler = {
    sendStdout(data: string): void;
    sendStderr(data: string): void;
    sendExit(code: number): void;
};
