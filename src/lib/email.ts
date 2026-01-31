
export async function sendInvitationEmail(to: string, link: string) {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM || 'Finanzapp <onboarding@resend.dev>'

    if (!apiKey) {
        console.warn('⚠️ [DEV MODE] Email skipped (No API Key).')
        console.log(`📧 To: ${to}`)
        console.log(`🔗 Link: ${link}`)
        return { success: true, dev: true }
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: from,
                to: [to],
                subject: 'Invitación a Finanzapp',
                html: `
                    <h1>Invitación a un Hogar</h1>
                    <p>Has sido invitado a unirte a un hogar en Finanzapp.</p>
                    <p>Haz clic en el siguiente enlace para aceptar:</p>
                    <a href="${link}">${link}</a>
                    <p>Este enlace caduca en 7 días.</p>
                `
            })
        })

        if (!res.ok) {
            const error = await res.text()
            console.error('Email sending failed:', error)
            return { success: false, error }
        }

        return { success: true }
    } catch (e) {
        console.error('Email exception:', e)
        return { success: false, error: String(e) }
    }
}
