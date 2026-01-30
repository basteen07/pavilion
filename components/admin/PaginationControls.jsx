import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
}) {
    if (totalPages <= 1 && totalItems === 0) return null;

    return (
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 border-t border-gray-100 gap-4 sm:gap-0">
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium">
                    Showing <span className="text-gray-900 font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-gray-900 font-bold">{totalItems}</span> entries
                </span>

                {onItemsPerPageChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Show</span>
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(val) => onItemsPerPageChange(Number(val))}
                        >
                            <SelectTrigger className="w-[70px] h-8 bg-white border-gray-200 focus:ring-offset-0 focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white hover:bg-gray-100 border-gray-200 disabled:opacity-50"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                    {/* First Page */}
                    {totalPages > 0 && (
                        <Button
                            variant={currentPage === 1 ? "default" : "outline"}
                            size="sm"
                            className={`h-8 w-8 p-0 ${currentPage === 1 ? "bg-black hover:bg-gray-800 text-white" : "bg-white hover:bg-gray-100 border-gray-200 text-gray-600"}`}
                            onClick={() => onPageChange(1)}
                        >
                            1
                        </Button>
                    )}

                    {/* Ellipsis Start */}
                    {currentPage > 3 && (
                        <span className="text-gray-400 px-1">...</span>
                    )}

                    {/* Middle Pages */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p !== 1 && p !== totalPages && Math.abs(currentPage - p) <= 1)
                        .map(page => (
                            <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className={`h-8 w-8 p-0 ${currentPage === page ? "bg-black hover:bg-gray-800 text-white" : "bg-white hover:bg-gray-100 border-gray-200 text-gray-600"}`}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </Button>
                        ))}

                    {/* Ellipsis End */}
                    {currentPage < totalPages - 2 && (
                        <span className="text-gray-400 px-1">...</span>
                    )}

                    {/* Last Page */}
                    {totalPages > 1 && (
                        <Button
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            className={`h-8 w-8 p-0 ${currentPage === totalPages ? "bg-black hover:bg-gray-800 text-white" : "bg-white hover:bg-gray-100 border-gray-200 text-gray-600"}`}
                            onClick={() => onPageChange(totalPages)}
                        >
                            {totalPages}
                        </Button>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white hover:bg-gray-100 border-gray-200 disabled:opacity-50"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
