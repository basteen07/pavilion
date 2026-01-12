'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Filter,
    X,
    ChevronDown,
    ChevronUp,
    Search,
    RotateCcw,
    LayoutGrid,
    ListFilter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function ProductFilters({
    brands = [],
    subCategories = [],
    categories = [],
    products = [], // New prop for dynamic filtering
    showCategories = false,
    showSubCategories = false,
    priceRange = { min: 0, max: 100000 }
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedSubCats, setSelectedSubCats] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [price, setPrice] = useState([priceRange.min, priceRange.max]);
    const [sort, setSort] = useState('featured');
    const [brandSearch, setBrandSearch] = useState('');

    // Sync with URL
    useEffect(() => {
        const brandParam = searchParams.get('brand');
        const subParam = searchParams.get('sub_category');
        const catParam = searchParams.get('category');
        const minPrice = searchParams.get('price_min');
        const maxPrice = searchParams.get('price_max');
        const currentSort = searchParams.get('sort');

        setSelectedBrands(brandParam ? brandParam.split(',').filter(Boolean) : []);
        setSelectedSubCats(subParam ? subParam.split(',').filter(Boolean) : []);
        setSelectedCategories(catParam ? catParam.split(',').filter(Boolean) : []);
        setSort(currentSort || 'featured');

        if (minPrice && maxPrice) setPrice([Number(minPrice), Number(maxPrice)]);
    }, [searchParams]);

    const applyFilters = (updates = {}) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('page');

        const brandsVal = updates.brands !== undefined ? updates.brands : selectedBrands;
        const subCatsVal = updates.subCats !== undefined ? updates.subCats : selectedSubCats;
        const catsVal = updates.cats !== undefined ? updates.cats : selectedCategories;
        const priceVal = updates.priceRangeVal !== undefined ? updates.priceRangeVal : price;
        const sortVal = updates.sortVal !== undefined ? updates.sortVal : sort;

        if (brandsVal.length > 0) params.set('brand', brandsVal.join(','));
        else params.delete('brand');

        if (subCatsVal.length > 0) params.set('sub_category', subCatsVal.join(','));
        else params.delete('sub_category');

        if (catsVal.length > 0) params.set('category', catsVal.join(','));
        else params.delete('category');

        params.set('price_min', priceVal[0]);
        params.set('price_max', priceVal[1]);
        params.set('sort', sortVal);

        router.push(`?${params.toString()}`, { scroll: false });
    };

    const clearFilters = () => {
        setSelectedBrands([]);
        setSelectedSubCats([]);
        setSelectedCategories([]);
        setPrice([priceRange.min, priceRange.max]);
        setSort('featured');
        router.push(window.location.pathname, { scroll: false });
        setIsMobileOpen(false);
    }

    const toggleBrand = (brandId) => {
        const next = selectedBrands.includes(brandId)
            ? selectedBrands.filter(id => id !== brandId)
            : [...selectedBrands, brandId];
        setSelectedBrands(next);
        applyFilters({ brands: next });
    };

    const toggleSubCat = (subId) => {
        const stringId = String(subId);
        const next = selectedSubCats.includes(stringId)
            ? selectedSubCats.filter(id => id !== stringId)
            : [...selectedSubCats, stringId];
        setSelectedSubCats(next);
        applyFilters({ subCats: next });
    };

    const toggleCategory = (catId) => {
        const next = selectedCategories.includes(catId)
            ? selectedCategories.filter(id => id !== catId)
            : [...selectedCategories, catId];
        setSelectedCategories(next);
        applyFilters({ cats: next });
    };

    // --- Dynamic Filter Logic ---

    // 1. Group Sub-Categories by Category for hierarchical display
    const groupedSubCats = useMemo(() => {
        const groups = {};
        subCategories.forEach(sc => {
            if (!groups[sc.category_id]) groups[sc.category_id] = [];
            groups[sc.category_id].push(sc);
        });
        return groups;
    }, [subCategories]);

    // 2. Filter Brands based on selected Categories (if any)
    const availableBrands = useMemo(() => {
        if (selectedCategories.length === 0 || products.length === 0) return brands;

        // Get brands that actually have products in the selected categories
        const activeBrandIds = new Set(
            products
                .filter(p => selectedCategories.includes(String(p.category_id)))
                .map(p => String(p.brand_id))
        );

        // We still want to show currently SELECTED brands even if they might not have products in the current cat selection
        // to allow deselecting them. But let's prioritize the "show contained brands" request.
        return brands.filter(b => activeBrandIds.has(String(b.id)) || selectedBrands.includes(String(b.id)));
    }, [brands, products, selectedCategories, selectedBrands]);

    const filteredBrands = availableBrands.filter(b =>
        b.name.toLowerCase().includes(brandSearch.toLowerCase())
    );

    const ActiveFilters = () => {
        const count = selectedBrands.length + selectedSubCats.length + selectedCategories.length;
        if (count === 0) return null;

        return (
            <div className="flex flex-wrap gap-2 mb-8 bg-gray-50/50 p-4 rounded-xl border border-gray-100 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mr-2">
                    <Filter className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active</span>
                </div>
                {selectedCategories.map(id => {
                    const name = categories.find(c => String(c.id) === id)?.name;
                    return name && (
                        <Badge key={id} variant="secondary" className="bg-white text-gray-900 border-gray-200 gap-1.5 px-3 py-1.5 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-all cursor-default">
                            <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Cat:</span>
                            {name}
                            <X className="w-3 h-3 cursor-pointer hover:text-red-600" onClick={() => toggleCategory(id)} />
                        </Badge>
                    );
                })}
                {selectedSubCats.map(id => {
                    const name = subCategories.find(s => String(s.id) === id)?.name;
                    return name && (
                        <Badge key={id} variant="secondary" className="bg-white text-gray-900 border-gray-200 gap-1.5 px-3 py-1.5 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-all cursor-default">
                            <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Sub:</span>
                            {name}
                            <X className="w-3 h-3 cursor-pointer hover:text-red-600" onClick={() => toggleSubCat(id)} />
                        </Badge>
                    );
                })}
                {selectedBrands.map(id => {
                    const name = brands.find(b => String(b.id) === id)?.name;
                    return name && (
                        <Badge key={id} variant="secondary" className="bg-white text-gray-900 border-gray-200 gap-1.5 px-3 py-1.5 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-all cursor-default">
                            <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Brand:</span>
                            {name}
                            <X className="w-3 h-3 cursor-pointer hover:text-red-600" onClick={() => toggleBrand(id)} />
                        </Badge>
                    );
                })}
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[10px] font-black uppercase tracking-widest text-red-600 h-8 hover:bg-red-50 px-4 rounded-full ml-auto">
                    Reset All Filters
                </Button>
            </div>
        );
    }

    const FilterContent = () => (
        <div className="space-y-8">
            {/* Sort Section */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Sort Products</h3>
                <Select value={sort} onValueChange={(val) => { setSort(val); applyFilters({ sortVal: val }); }}>
                    <SelectTrigger className="w-full border-gray-200 focus:ring-red-600">
                        <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="featured">Featured / New</SelectItem>
                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        <SelectItem value="name_asc">Name: A to Z</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Price Filter */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Price Budget</h3>
                <Slider
                    defaultValue={[priceRange.min, priceRange.max]}
                    value={price}
                    min={0}
                    max={100000}
                    step={100}
                    onValueChange={(val) => setPrice(val)}
                    onValueCommit={(val) => applyFilters({ priceRangeVal: val })}
                    className="py-4"
                />
                <div className="flex items-center justify-between">
                    <div className="text-center">
                        <span className="block text-[10px] uppercase font-bold text-gray-400">Min</span>
                        <span className="text-sm font-black">₹{price[0].toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-gray-100 flex-1 mx-4" />
                    <div className="text-center">
                        <span className="block text-[10px] uppercase font-bold text-gray-400">Max</span>
                        <span className="text-sm font-black">₹{price[1].toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Categories Filter */}
            {showCategories && categories.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Main Category</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => toggleCategory(String(cat.id))}>
                                <Checkbox
                                    id={`cat-${cat.id}`}
                                    checked={selectedCategories.includes(String(cat.id))}
                                    className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                    onCheckedChange={() => { }} // Controlled by parent div click
                                />
                                <Label htmlFor={`cat-${cat.id}`} className="text-sm font-bold text-gray-600 group-hover:text-gray-900 cursor-pointer flex-1">
                                    {cat.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sub Categories Filter - Grouped Hierarchically */}
            {showSubCategories && (
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Available Series</h3>
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {/* If we have grouped subcats, show them by category. Otherwise show flat. */}
                        {Object.entries(groupedSubCats).length > 0 ? (
                            Object.entries(groupedSubCats).map(([catId, subs]) => {
                                const catName = categories.find(c => String(c.id) === catId)?.name || 'General';
                                const isCatSelected = selectedCategories.includes(String(catId));

                                return (
                                    <div key={catId} className={`space-y-2 pb-4 border-b border-gray-50 last:border-0 ${isCatSelected ? 'opacity-100' : 'opacity-60 grayscale-[0.5]'}`}>
                                        <h4 className="text-[9px] font-black uppercase text-gray-400 mb-2 truncate bg-gray-50 px-2 py-0.5 rounded-sm inline-block">
                                            {catName}
                                        </h4>
                                        <div className="space-y-2 ml-1">
                                            {subs.map((sub) => (
                                                <div key={sub.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => toggleSubCat(sub.id)}>
                                                    <Checkbox
                                                        id={`sub-${sub.id}`}
                                                        checked={selectedSubCats.includes(String(sub.id))}
                                                        className="h-4 w-4 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                        onCheckedChange={() => { }}
                                                    />
                                                    <Label htmlFor={`sub-${sub.id}`} className="text-xs font-bold text-gray-500 group-hover:text-gray-900 cursor-pointer flex-1 line-clamp-1">
                                                        {sub.name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            subCategories.map((sub) => (
                                <div key={sub.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => toggleSubCat(sub.id)}>
                                    <Checkbox
                                        id={`sub-${sub.id}`}
                                        checked={selectedSubCats.includes(String(sub.id))}
                                        className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                        onCheckedChange={() => { }}
                                    />
                                    <Label htmlFor={`sub-${sub.id}`} className="text-sm font-bold text-gray-600 group-hover:text-gray-900 cursor-pointer flex-1">
                                        {sub.name}
                                    </Label>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Brands Filter */}
            {brands.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Brand Selection</h3>
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={brandSearch}
                            onChange={(e) => setBrandSearch(e.target.value)}
                            placeholder="Find brand..."
                            className="pl-9 h-9 text-xs border-gray-100 bg-gray-50/50"
                        />
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {filteredBrands.length > 0 ? filteredBrands.map((brand) => (
                            <div key={brand.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => toggleBrand(String(brand.id))}>
                                <Checkbox
                                    id={`brand-${brand.id}`}
                                    checked={selectedBrands.includes(String(brand.id))}
                                    className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                    onCheckedChange={() => { }}
                                />
                                <Label htmlFor={`brand-${brand.id}`} className="text-sm font-bold text-gray-600 group-hover:text-gray-900 cursor-pointer flex-1">
                                    {brand.name}
                                </Label>
                            </div>
                        )) : (
                            <p className="text-[10px] text-gray-400 italic text-center py-4">No matching brands in selection</p>
                        )}
                    </div>
                </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
                <Button onClick={clearFilters} variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600">
                    <RotateCcw className="w-3 h-3 mr-2" /> Reset All
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Filter Button */}
            <div className="lg:hidden sticky top-[72px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 mb-6">
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="w-full flex items-center justify-between font-black uppercase tracking-widest text-[10px] border-2 border-gray-900">
                            <span className="flex items-center gap-2">
                                <ListFilter className="w-4 h-4" />
                                Filter & Sort
                            </span>
                            {(selectedBrands.length + selectedSubCats.length + selectedCategories.length) > 0 && (
                                <Badge className="bg-red-600 text-[10px]">
                                    {selectedBrands.length + selectedSubCats.length + selectedCategories.length}
                                </Badge>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto pt-10">
                        <SheetHeader className="mb-8 border-b pb-4">
                            <SheetTitle className="text-2xl font-black uppercase tracking-tighter">Shop Filters</SheetTitle>
                        </SheetHeader>
                        <FilterContent />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
                <div className="sticky top-24">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-gray-900 rounded-lg">
                            <LayoutGrid className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight leading-none">Filters</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Refine Catalog</p>
                        </div>
                    </div>

                    <ActiveFilters />
                    <FilterContent />
                </div>
            </aside>
        </>
    );
}
