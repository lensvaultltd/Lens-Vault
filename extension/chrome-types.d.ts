// Chrome Extension API Type Declarations
declare namespace chrome {
    namespace runtime {
        function sendMessage(message: any, callback?: (response: any) => void): void;
        const lastError: { message: string } | undefined;
        const onMessage: {
            addListener(callback: (request: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void;
        };
    }

    namespace tabs {
        function query(query: any, callback: (tabs: any[]) => void): void;
        function sendMessage(tabId: number, message: any, callback?: (response: any) => void): void;
    }

    namespace storage {
        namespace local {
            function get(keys: string[], callback: (result: any) => void): void;
            function set(items: any, callback?: () => void): void;
        }
    }

    namespace action {
        function setBadgeText(details: { text: string }): void;
        function setBadgeBackgroundColor(details: { color: string }): void;
        const onClicked: {
            addListener(callback: () => void): void;
        };
    }
}
