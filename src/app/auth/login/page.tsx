
import { LoginForm } from '@/components/auth/login-form'

import { Suspense } from 'react'

export default function LoginPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Suspense fallback={<div className="h-[400px] w-full max-w-sm bg-muted animate-pulse rounded-lg" />}>
                <LoginForm />
            </Suspense>
        </div>
    )
}
