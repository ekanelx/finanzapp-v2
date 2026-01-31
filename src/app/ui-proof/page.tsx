import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function UIProofPage() {
    return (
        <div className="container mx-auto py-10 space-y-8 max-w-4xl">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">UI Fidelity Proof (Maia Preset)</h1>
                    <p className="text-muted-foreground">This page should match <a href="https://ui.shadcn.com/themes" className="underline text-primary" target="_blank">shadcn themes</a> preview.</p>
                </div>
                <div className="flex items-center gap-4 border rounded-md p-2 bg-card">
                    <ThemeToggle />
                    <div className="text-sm text-muted-foreground flex gap-2">
                        <span>Current:</span>
                        <span className="font-mono font-bold text-foreground block dark:hidden">LIGHT</span>
                        <span className="font-mono font-bold text-foreground hidden dark:block">DARK</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="h-20 w-20 rounded bg-background border flex items-center justify-center text-xs">Bg</div>
                <div className="h-20 w-20 rounded bg-card border flex items-center justify-center text-xs">Card</div>
                <div className="h-20 w-20 rounded bg-popover border flex items-center justify-center text-xs">Popover</div>
                <div className="h-20 w-20 rounded bg-muted flex items-center justify-center text-xs">Muted</div>
                <div className="h-20 w-20 rounded bg-accent flex items-center justify-center text-xs">Accent</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card & Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create an account</CardTitle>
                        <CardDescription>Enter your email below to create your account.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="m@example.com" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="terms" />
                            <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Accept terms and conditions
                            </label>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full">Create account (Primary)</Button>
                        <Button variant="outline" className="w-full">Cancel (Outline)</Button>
                    </CardFooter>
                </Card>

                {/* Buttons Variants */}
                <Card>
                    <CardHeader>
                        <CardTitle>Button Variants</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button variant="secondary">Secondary Button</Button>
                        <Button variant="destructive">Destructive Button</Button>
                        <Button variant="ghost">Ghost Button</Button>
                        <Button variant="link">Link Button</Button>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">INV001</TableCell>
                            <TableCell>Paid</TableCell>
                            <TableCell>Credit Card</TableCell>
                            <TableCell className="text-right">$250.00</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">INV002</TableCell>
                            <TableCell>Pending</TableCell>
                            <TableCell>PayPal</TableCell>
                            <TableCell className="text-right">$150.00</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
