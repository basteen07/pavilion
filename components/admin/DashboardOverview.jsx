import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DashboardOverview({ stats = {}, user, onSetupMFA }) {
    if (!stats) return null;
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.products || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">B2B Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.customers || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Quotations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.quotations || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-red-600">{stats.pending_approvals || 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* MFA Setup */}
            {user && !user.mfa_enabled && (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Secure Your Account</h3>
                            <p className="text-sm text-gray-600">Enable Multi-Factor Authentication for enhanced security</p>
                        </div>
                        <Button onClick={onSetupMFA} className="bg-yellow-600 hover:bg-yellow-700">
                            Setup MFA
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
