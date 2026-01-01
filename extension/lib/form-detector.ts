export interface LoginForm {
    form: HTMLFormElement;
    usernameField: HTMLInputElement | null;
    passwordField: HTMLInputElement;
}

export class FormDetector {
    private observer: MutationObserver | null = null;
    private detectedForms: Set<HTMLFormElement> = new Set();

    /**
     * Find all login forms on the page
     */
    detectLoginForms(): LoginForm[] {
        const forms: LoginForm[] = [];
        const passwordFields = document.querySelectorAll<HTMLInputElement>(
            'input[type="password"]'
        );

        passwordFields.forEach((passwordField) => {
            // Find the parent form
            const form = passwordField.closest('form') as HTMLFormElement | null;

            // Find username field (look for email or text inputs)
            const usernameField = this.findUsernameField(form || document.body, passwordField);

            if (usernameField || form) {
                const loginForm: LoginForm = {
                    form: form || (passwordField.parentElement as HTMLFormElement),
                    usernameField,
                    passwordField,
                };

                forms.push(loginForm);

                if (form) {
                    this.detectedForms.add(form);
                }
            }
        });

        return forms;
    }

    /**
     * Find the most likely username/email field near a password field
     */
    private findUsernameField(
        scope: HTMLElement,
        passwordField: HTMLInputElement
    ): HTMLInputElement | null {
        // Look for email or text inputs before the password field
        const candidates = scope.querySelectorAll<HTMLInputElement>(
            'input[type="email"], input[type="text"], input:not([type])'
        );

        for (const candidate of Array.from(candidates)) {
            // Skip if it's after the password field
            if (
                passwordField.compareDocumentPosition(candidate) &
                Node.DOCUMENT_POSITION_FOLLOWING
            ) {
                continue;
            }

            // Check if field looks like a username/email field
            const name = candidate.name.toLowerCase();
            const id = candidate.id.toLowerCase();
            const placeholder = candidate.placeholder.toLowerCase();
            const autocomplete = candidate.getAttribute('autocomplete')?.toLowerCase() || '';

            if (
                name.includes('user') ||
                name.includes('email') ||
                name.includes('login') ||
                id.includes('user') ||
                id.includes('email') ||
                id.includes('login') ||
                placeholder.includes('email') ||
                placeholder.includes('username') ||
                autocomplete.includes('username') ||
                autocomplete.includes('email')
            ) {
                return candidate;
            }
        }

        // If no specific match, return the first text/email input before password
        return (
            scope.querySelector<HTMLInputElement>(
                'input[type="email"], input[type="text"]'
            ) || null
        );
    }

    /**
     * Start observing DOM for new login forms
     */
    startObserving(callback: (forms: LoginForm[]) => void) {
        // Initial detection
        const initialForms = this.detectLoginForms();
        if (initialForms.length > 0) {
            callback(initialForms);
        }

        // Watch for new forms
        this.observer = new MutationObserver(() => {
            const forms = this.detectLoginForms();
            const newForms = forms.filter((f) => !this.detectedForms.has(f.form));

            if (newForms.length > 0) {
                callback(newForms);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * Stop observing
     */
    stopObserving() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    /**
     * Extract current values from a login form
     */
    extractCredentials(loginForm: LoginForm): {
        username: string;
        password: string;
    } | null {
        const username = loginForm.usernameField?.value || '';
        const password = loginForm.passwordField.value || '';

        if (!password) {
            return null;
        }

        return { username, password };
    }

    /**
     * Fill credentials into a login form
     */
    fillCredentials(
        loginForm: LoginForm,
        username: string,
        password: string
    ) {
        if (loginForm.usernameField) {
            this.setFieldValue(loginForm.usernameField, username);
        }
        this.setFieldValue(loginForm.passwordField, password);
    }

    /**
     * Set field value and trigger events for React/Vue/Angular compatibility
     */
    private setFieldValue(field: HTMLInputElement, value: string) {
        // Native setter
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value'
        )?.set;

        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(field, value);
        } else {
            field.value = value;
        }

        // Trigger events for framework detection
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.dispatchEvent(new Event('blur', { bubbles: true }));
    }
}
