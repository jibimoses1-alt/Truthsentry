'use client';

import {
    useCallback,
    useState,
    type MouseEvent,
    type ReactElement,
} from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@truthsentry/ui/components/button';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@truthsentry/ui/components/input-group';

export type PasswordInputWithToggleProps = {
    id: string;
    name?: string;
    autoComplete?: string;
    required?: boolean;
    'aria-invalid'?: boolean | 'true' | 'false';
};

export function PasswordInputWithToggle({
    id,
    name = 'password',
    autoComplete,
    required,
    'aria-invalid': ariaInvalid,
}: PasswordInputWithToggleProps): ReactElement {
    const t = useTranslations('auth.passwordToggle');
    const [visible, setVisible] = useState(false);

    const handleToggleMouseDown = useCallback((e: MouseEvent) => {
        e.preventDefault();
    }, []);

    return (
        <InputGroup>
            <InputGroupInput
                id={id}
                name={name}
                type={visible ? 'text' : 'password'}
                autoComplete={autoComplete}
                required={required}
                aria-invalid={ariaInvalid}
            />
            <InputGroupAddon align="inline-end">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={visible ? t('hide') : t('show')}
                    aria-pressed={visible}
                    onMouseDown={handleToggleMouseDown}
                    onClick={() => setVisible((v) => !v)}
                >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
            </InputGroupAddon>
        </InputGroup>
    );
}
