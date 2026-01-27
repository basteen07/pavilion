'use client'

import {
    LayoutDashboard,
    Package,
    FileText,
    ShoppingCart,
    Settings,
    HelpCircle,
    Building2,
    Image as ImageIcon,
    LayoutList,
    ChevronUp,
    User2,
    Users as UsersIcon,
    Briefcase,
    FolderOpen,
    ShieldCheck,
    ChevronDown,
    Eye,
    Grid3X3,
    Tag,
    Store,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
    SidebarCollapsible,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@/components/ui/collapsible"

// Menu items configuration
const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/admin/dashboard",
            icon: LayoutDashboard,
            isActive: true,
        },
        {
            title: "Catalog",
            url: "#",
            icon: Package,
            items: [
                {
                    title: "Overview",
                    url: "/admin/catalog",
                    icon: Eye,
                },
                {
                    title: "Products",
                    url: "/admin/products",
                    icon: Package,
                },
                {
                    title: "Collections",
                    url: "/admin/collections",
                    icon: Grid3X3,
                },
                {
                    title: "Categories",
                    url: "/admin/categories",
                    icon: LayoutList,
                },
                {
                    title: "Brands",
                    url: "/admin/brands",
                    icon: Store,
                },
                {
                    title: "Tags",
                    url: "/admin/tags",
                    icon: Tag,
                },
            ],
        },
        {
            title: "Sales",
            url: "#",
            icon: FileText,
            items: [
                {
                    title: "Quotations",
                    url: "/admin/quotations",
                    icon: FileText,
                },
                {
                    title: "Customers",
                    url: "/admin/customers",
                    icon: Building2,
                },
            ],
        },
        {
            title: "Wholesale",
            url: "#",
            icon: ShoppingCart,
            items: [
                {
                    title: "Orders",
                    url: "/admin/orders",
                    icon: ShoppingCart,
                },
                {
                    title: "B2B Requests",
                    url: "/admin/requests",
                    icon: User2,
                },
            ],
        },
    ],
    cms: [
        {
            title: "Banners",
            url: "/admin/banners",
            icon: ImageIcon,
        },
        {
            title: "Careers",
            url: "/admin/careers",
            icon: Briefcase,
        },
        {
            title: "Gallery",
            url: "/admin/gallery",
            icon: FolderOpen,
        },
        {
            title: "Blogs",
            url: "/admin/blogs",
            icon: FileText,
        },
        {
            title: "Pages",
            url: "/admin/cms-pages",
            icon: LayoutList,
        },
        {
            title: "Site Settings",
            url: "/admin/site-settings",
            icon: Settings,
        },
    ],
    navSecondary: [
        {
            title: "Settings",
            url: "/admin/settings",
            icon: Settings,
        },
        {
            title: "Help",
            url: "/admin/help",
            icon: HelpCircle,
        },
    ],
    superadminOnly: [
        {
            title: "Users",
            url: "/admin/users",
            icon: UsersIcon,
        },
        {
            title: "Roles & Permissions",
            url: "/admin/roles",
            icon: ShieldCheck,
        },
    ],
}

export function AdminSidebar({ ...props }) {
    const pathname = usePathname()
    const { user } = useAuth()
    const isSuperadmin = user?.role === 'superadmin' || user?.role_name === 'superadmin'

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-1 overflow-hidden">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
                        <span className="text-lg font-bold text-white">P</span>
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">Pavilion Sports</span>
                        <span className="truncate text-xs">Admin Console</span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {data.navMain.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    {item.items ? (
                                        // Expandable sub-menu
                                        <Collapsible
                                            defaultOpen={item.items.some(subItem => pathname === subItem.url || pathname.startsWith(subItem.url + '/'))}
                                        >
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton tooltip={item.title}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                    <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {item.items.map((subItem) => (
                                                        <SidebarMenuSubItem key={subItem.title}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={pathname === subItem.url || pathname.startsWith(subItem.url + '/')}
                                                            >
                                                                <Link href={subItem.url}>
                                                                    <subItem.icon className="h-4 w-4" />
                                                                    <span>{subItem.title}</span>
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ) : (
                                        // Regular menu item
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.title}
                                            isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                                        >
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    )}
                                </SidebarMenuItem>
                            ))}
                            {isSuperadmin && data.superadminOnly.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                                    >
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>CMS</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {data.cms.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={pathname === item.url}
                                    >
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup className="mt-auto">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {data.navSecondary.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild size="sm" tooltip={item.title}>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {/* Footer content if needed */}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
