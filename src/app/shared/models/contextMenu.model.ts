export interface contextMenu {
    title: string;
    icon?: string;
    disabled?: boolean;
    operation?: (context?: unknown) => void;
}