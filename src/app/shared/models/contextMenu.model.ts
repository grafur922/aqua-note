export interface contextMenu {
    title: string;
    icon?: string;
    operation?: (context?: unknown) => void;
}