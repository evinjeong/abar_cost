import React, { useState, useEffect, useMemo } from 'react';
import initialData from './data/initialData.json';
import {
    LayoutDashboard,
    FileSpreadsheet,
    Settings,
    History,
    Plus,
    Download,
    Upload,
    FileText,
    Calculator,
    Search,
    ChevronRight,
    Package,
    ArrowRightLeft,
    X,
    Save,
    Trash2,
    Calendar,
    Tag,
    Truck,
    Box,
    Percent,
    Edit3,
    Menu,
    LogOut,
    Grid,
    Printer,
    Check
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateFinalCost, calculatePrices, formatCurrency } from './utils/calculations';
import { exportToExcel, exportToPDF, parseExcel } from './utils/fileHandlers';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 bg-red-900 text-white w-full h-full overflow-auto">
                    <h1 className="text-2xl font-bold mb-4">React Crash Encountered</h1>
                    <pre className="text-sm whitespace-pre-wrap">{this.state.error?.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}


function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// ----------------------------------------------------------------------------
// Types & Defaults
// ----------------------------------------------------------------------------

const DEFAULT_CATEGORIES = [
    '기기', '생필품', '건강', '일반건강식품', '건강기능식품', '식품(실온)', '식품(냉동)'
];

const TAX_TYPES = ['과세', '면세', '영세'];

const DEFAULT_PRODUCT = {
    id: '',
    vendor: '',
    name: '',
    category: '일반건강식품',
    spec: '',
    composition: '',
    compositionQty: 1,
    compositionUnit: '개',
    unitPrice: 0,
    shippingCost: 0,
    packagingCost: 0,
    lossRate: 0,
    otherCosts: 0,
    broadcastPrice: 0,
    taxType: '과세',
    inboxQty: 1,
    outboxQty: 1,
    cartonQty: 1,
    consumeLimit: '',
    shelfLife: '',
    barcode: '',
    remarks: '',
    marginRate: 23,
    updatedAt: new Date().toISOString()
};

const TAB_CONFIG = [
    { id: 'costs', label: '매입원가관리', icon: FileSpreadsheet },
    { id: 'products', label: '상품제안/리스트', icon: Package },
    { id: 'homeshopping', label: '홈쇼핑손익분석', icon: LayoutDashboard },
    { id: 'history', label: '원가히스토리', icon: History },
    { id: 'settings', label: '설정', icon: Settings },
];

// ----------------------------------------------------------------------------
// Main Application
// ----------------------------------------------------------------------------

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return sessionStorage.getItem('ABAR_SESSION') === 'true';
    });
    const [password, setPassword] = useState(() => {
        const saved = localStorage.getItem('abar_password');
        if (saved) return saved;
        return 'abar1234';
    });
    const [loginInput, setLoginInput] = useState('');
    const [loginError, setLoginError] = useState(false);

    const [activeTab, setActiveTab] = useState('costs');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [activeTab]);
    const [products, setProducts] = useState(() => {
        const saved = localStorage.getItem('abar_products');
        if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
        return initialData.products || [];
    });
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem('abar_history');
        if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
        return initialData.history || [];
    });

    const [shippingRules, setShippingRules] = useState(() => {
        const saved = localStorage.getItem('abar_shipping_rules');
        if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
        return initialData.shipping_rules || [];
    });

    const [homeshoppingChannels, setHomeshoppingChannels] = useState(() => {
        const saved = localStorage.getItem('abar_hs_channels');
        if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
        return initialData.hs_channels || [];
    });

    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem('abar_categories');
        if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
        return initialData.categories || [];
    });

    useEffect(() => {
        localStorage.setItem('abar_categories', JSON.stringify(categories));
    }, [categories]);

    useEffect(() => {
        localStorage.setItem('abar_hs_channels', JSON.stringify(homeshoppingChannels));
    }, [homeshoppingChannels]);

    const handleLogin = (e) => {
        if (e) e.preventDefault();
        if (loginInput === password) {
            localStorage.removeItem('abar_auth');
            sessionStorage.setItem('ABAR_SESSION', 'true');
            setIsAuthenticated(true);
            setLoginError(false);
            window.location.reload();
        } else {
            setLoginError(true);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('ABAR_SESSION');
        localStorage.removeItem('abar_auth');
        setIsAuthenticated(false);
        window.location.reload();
    };

    const handleChangePassword = (newPass) => {
        setPassword(newPass);
        localStorage.setItem('abar_password', newPass);
        alert('비밀번호가 변경되었습니다.');
    };

    // Persistence
    useEffect(() => {
        localStorage.setItem('abar_products', JSON.stringify(products));
    }, [products]);

    useEffect(() => {
        localStorage.setItem('abar_history', JSON.stringify(history));
    }, [history]);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Filtered Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchSearch = (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                (p.vendor || '').toLowerCase().includes((searchTerm || '').toLowerCase());
            const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
            return matchSearch && matchCategory;
        });
    }, [products, searchTerm, categoryFilter]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
                <div className="glass-panel w-full max-w-md p-8 space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-primary-600/20 mb-4">
                            <Calculator size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-widest uppercase">ABAR COST</h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Dashboard Authentication</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Admin Password</label>
                            <input
                                type="password"
                                className={cn("input-field w-full h-14 text-center text-2xl tracking-[1em]", loginError && "border-red-500 ring-red-500/20")}
                                placeholder="••••"
                                value={loginInput}
                                onChange={(e) => setLoginInput(e.target.value)}
                                autoFocus
                            />
                            {loginError && <p className="text-red-500 text-[10px] font-bold text-center animate-bounce uppercase">Access Denied: Incorrect Password</p>}
                        </div>

                        <button type="submit" className="btn-primary w-full h-14 text-lg">
                            UNLOCK DASHBOARD
                        </button>
                    </form>

                    <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                        Default: abar1234 | Secure Session via Chrome
                    </p>
                </div>
            </div>
        );
    }

    // Actions
    const handleAddProduct = () => {
        setSelectedProduct({ ...DEFAULT_PRODUCT, id: Date.now().toString() });
        setIsModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleSaveProduct = (updatedProduct) => {
        const isNew = !products.find(p => p.id === updatedProduct.id);

        // Add to history if cost changed
        const oldProduct = products.find(p => p.id === updatedProduct.id);
        if (oldProduct && (oldProduct.unitPrice !== updatedProduct.unitPrice)) {
            setHistory(prev => [{
                id: Date.now().toString(),
                productId: updatedProduct.id,
                productName: updatedProduct.name,
                oldPrice: oldProduct.unitPrice,
                newPrice: updatedProduct.unitPrice,
                date: new Date().toISOString()
            }, ...prev]);
        }

        if (isNew) {
            setProducts([updatedProduct, ...products]);
        } else {
            setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        }

        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    const handleDeleteProduct = (id) => {
        if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await parseExcel(file);
            // Simple mapping assuming headers match or proximity
            const mapped = data.map(item => ({
                ...DEFAULT_PRODUCT,
                id: Date.now().toString() + Math.random(),
                vendor: item['업체'] || item.vendor || '',
                name: item['제품명'] || item.name || '',
                spec: item['규격'] || item.spec || '',
                compositionQty: Number(item['구성수량'] || item.compositionQty || 1),
                compositionUnit: item['구성단위'] || item.compositionUnit || '개',
                unitPrice: Number(item['단가'] || item.unitPrice || 0),
                shippingCost: Number(item['배송비'] || item.shippingCost || 0),
                packagingCost: Number(item['포장비'] || item.packagingCost || 0),
                lossRate: Number(item['로스율(%)'] || item['로스율'] || item.lossRate || 0),
                category: item['구분'] || item.category || DEFAULT_PRODUCT.category,
                taxType: item['과세유형'] || item.taxType || '면세',
                inboxQty: Number(item['인박스수량'] || item.inboxQty || 0),
                outboxQty: Number(item['아웃박스수량'] || item.outboxQty || 0),
                cartonQty: Number(item['카톤수량'] || item.cartonQty || 0),
                consumeLimit: item['소비기한'] || item.consumeLimit || '',
                shelfLife: item['유통기한'] || item.shelfLife || '',
                barcode: item['바코드'] || item.barcode || '',
                onlinePrice: Number(item['온라인판매가'] || item.onlinePrice || 0),
                broadcastPrice: Number(item['방송단가'] || item.broadcastPrice || 0),
                remarks: item['비고'] || item.remarks || '',
                marginRate: Number(item['마진율'] || item.marginRate || 20),
            }));
            setProducts([...mapped, ...products]);
        } catch (err) {
            alert('파일 처리 중 오류가 발생했습니다.');
        }
    };


    return (
        <div className="flex flex-col min-h-screen bg-[#020617] text-slate-200 overflow-hidden h-screen font-sans">
            {/* Mobile Header */}
            <header className="flex md:hidden items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <Calculator className="text-white" size={16} />
                    </div>
                    <h1 className="font-black text-lg tracking-tighter text-white">ABAR</h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all transform active:scale-95 border border-white/5"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </header>

            {/* Sidebar Overlay (Mobile) */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className="flex h-screen overflow-hidden relative">
                {/* Navigation Sidebar */}
                <aside className={cn(
                    "w-64 bg-slate-950/40 backdrop-blur-3xl border-r border-white/5 flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-300 transform md:relative md:translate-x-0 h-full",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="p-8 hidden md:flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-500/30">
                            <Calculator className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="font-black text-2xl tracking-tighter text-white leading-none">ABAR</h1>
                            <p className="text-[10px] text-primary-500 font-bold uppercase tracking-[0.2em] mt-1">Cost Intelligence</p>
                        </div>
                    </div>

                    <div className="p-4 md:p-2 select-none">
                        <nav className="px-3 space-y-1 md:mt-6">
                            {TAB_CONFIG.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                        activeTab === tab.id
                                            ? "bg-primary-600 text-white shadow-2xl shadow-primary-600/30"
                                            : "text-slate-500 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <tab.icon size={20} className={cn("transition-transform", activeTab === tab.id ? "scale-110" : "scale-100 group-hover:scale-110")} />
                                    <span className="font-bold tracking-tight">{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-auto p-4 border-t border-white/5">
                        <div className="bg-slate-900/40 backdrop-blur p-4 rounded-2xl border border-white/5 flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                AD
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1 truncate">Administrator</p>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <p className="text-[9px] font-black text-primary-400 uppercase tracking-wider">Active Session</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                title="로그아웃"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#020617] relative">
                    <div className="max-w-[1400px] mx-auto p-6 md:p-12 pb-32 space-y-12">
                        {activeTab === 'costs' && (
                            <CostManagement
                                products={filteredProducts}
                                categories={categories}
                                onEdit={handleEditProduct}
                                onAdd={handleAddProduct}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                categoryFilter={categoryFilter}
                                setCategoryFilter={setCategoryFilter}
                                onFileUpload={handleFileUpload}
                                onDownloadAll={() => {
                                    const exportData = products.map(p => ({
                                        '업체': p.vendor,
                                        '제품명': p.name,
                                        '구분': p.category,
                                        '규격': p.spec,
                                        '구성수량': p.compositionQty,
                                        '구성단위': p.compositionUnit,
                                        '단가': p.unitPrice,
                                        '배송비': p.shippingCost,
                                        '포장비': p.packagingCost,
                                        '로스율(%)': p.lossRate,
                                        '과세유형': p.taxType,
                                        '인박스수량': p.inboxQty,
                                        '아웃박스수량': p.outboxQty,
                                        '카톤수량': p.cartonQty,
                                        '소비기한': p.consumeLimit,
                                        '유통기한': p.shelfLife,
                                        '바코드': p.barcode,
                                        '온라인판매가': p.onlinePrice,
                                        '방송단가': p.broadcastPrice,
                                        '비고': p.remarks,
                                        '마진율': p.marginRate
                                    }));
                                    exportToExcel(exportData, 'ABAR_매입원가_전체');
                                }}
                                onDelete={handleDeleteProduct}
                            />
                        )}
                        {activeTab === 'products' && (
                            <ErrorBoundary>
                                <ProductProposal
                                    products={products}
                                    shippingRules={shippingRules}
                                    onMarginUpdate={(id, val) => {
                                        setProducts(products.map(p => p.id === id ? { ...p, marginRate: val } : p));
                                    }}
                                />
                            </ErrorBoundary>
                        )}
                        {activeTab === 'homeshopping' && (
                            <HomeShoppingAnalysis
                                channels={homeshoppingChannels}
                                setChannels={setHomeshoppingChannels}
                                products={products}
                            />
                        )}
                        {activeTab === 'history' && (
                            <HistoryTable
                                data={history}
                                onDelete={(id) => setHistory(history.filter(h => h.id !== id))}
                                onEdit={(id, updated) => setHistory(history.map(h => h.id === id ? { ...h, ...updated } : h))}
                                onDownload={() => exportToExcel(history, 'ABAR_원가히스토리')}
                                onUpload={async (e) => {
                                    const data = await parseExcel(e.target.files[0]);
                                    setHistory([...data.map(h => ({ ...h, id: Date.now().toString() + Math.random() })), ...history]);
                                }}
                            />
                        )}
                        {activeTab === 'settings' && (
                            <SettingsView
                                currentPassword={password}
                                onPasswordChange={handleChangePassword}
                                onLogout={handleLogout}
                                shippingRules={shippingRules}
                                setShippingRules={setShippingRules}
                                categories={categories}
                                setCategories={setCategories}
                            />
                        )}
                    </div>
                </main>
            </div>

            {/* Product Detail Modal */}
            {isModalOpen && (
                <ProductModal
                    product={selectedProduct}
                    categories={categories}
                    onSave={handleSaveProduct}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedProduct(null);
                    }}
                    shippingRules={shippingRules}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------------------------------
// Section: Cost Management
// ----------------------------------------------------------------------------

function CostManagement({
    products,
    categories,
    onEdit,
    onAdd,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    onFileUpload,
    onDownloadAll,
    onDelete
}) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white">매입원가 관리</h2>
                    <p className="text-slate-400 text-sm mt-1">실시간 원가 계산 및 상품별 데이터베이스 관리</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button className="btn-secondary" onClick={onDownloadAll}>
                        <Download size={18} />
                        <span>데이터 다운로드</span>
                    </button>
                    <button className="btn-secondary" onClick={() => {
                        const template = [{
                            '업체': '',
                            '제품명': '',
                            '구분': '일반건강식품',
                            '규격': '',
                            '구성수량': 1,
                            '구성단위': '개',
                            '단가': 10000,
                            '배송비': 3000,
                            '포장비': 500,
                            '로스율(%)': 0,
                            '과세유형': '면세',
                            '인박스수량': 1,
                            '아웃박스수량': 1,
                            '카톤수량': 1,
                            '소비기한': '',
                            '유통기한': '',
                            '바코드': '',
                            '온라인판매가': 0,
                            '방송단가': 0,
                            '비고': ''
                        }];
                        exportToExcel(template, 'ABAR_원가업로드양식');
                    }}>
                        <FileSpreadsheet size={18} />
                        <span>양식 다운로드</span>
                    </button>
                    <label className="btn-secondary cursor-pointer">
                        <Upload size={18} />
                        <span>엑셀 업로드</span>
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={onFileUpload} />
                    </label>
                    <button className="btn-primary" onClick={onAdd}>
                        <Plus size={18} />
                        <span>새 상품 등록</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 glass-panel p-4 items-stretch lg:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="상품명, 업체명으로 검색..."
                        className="input-field w-full pl-12 h-14 md:h-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="input-field h-14 md:h-12 lg:min-w-[180px]"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="All">전체 카테고리</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="glass-panel overflow-hidden border-none shadow-2xl">
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">업체 / 분류</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">상품 정보</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">매입단가</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">기타비용</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">최종원가</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {products.length > 0 ? products.map(product => {
                                const finalCost = calculateFinalCost(product);
                                return (
                                    <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => onEdit(product)}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white text-xs">{product.vendor || '-'}</div>
                                            <div className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded inline-block mt-1 font-bold uppercase tracking-tighter">
                                                {product.category}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-200 text-sm leading-snug">{product.name}</div>
                                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                <span className="flex items-center gap-1"><Tag size={12} /> {product.spec || '규격 없음'}</span>
                                                {(product.compositionQty || product.compositionUnit) && (
                                                    <span className="flex items-center gap-1 font-bold text-primary-500/80">
                                                        <Box size={12} /> {product.compositionQty}{product.compositionUnit}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs">
                                            {formatCurrency(product.unitPrice)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-[11px] text-slate-400">
                                            <div>배송: {formatCurrency(product.shippingCost)}</div>
                                            <div>포장: {formatCurrency(product.packagingCost)}</div>
                                            {product.bundleQty > 1 && <div className="text-primary-400">합포장: {product.bundleQty}개</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-black text-primary-400 font-mono text-sm">{formatCurrency(finalCost)}</div>
                                            <div className="text-[9px] text-slate-500">로스율 {product.lossRate}% 포함</div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(product);
                                                    }}
                                                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-sm"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(product.id);
                                                    }}
                                                    className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-all shadow-sm border border-red-500/20"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 grayscale opacity-20">
                                            <FileSpreadsheet size={64} />
                                            <p className="text-lg font-bold">등록된 상품이 없습니다.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden p-4 space-y-4">
                    {products.length > 0 ? products.map(product => {
                        const finalCost = calculateFinalCost(product);
                        return (
                            <div key={product.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4" onClick={() => onEdit(product)}>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="text-[11px] font-black text-primary-400 uppercase tracking-widest">{product.vendor}</div>
                                        <div className="text-base font-black text-white leading-snug">{product.name}</div>
                                        <div className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded inline-block font-bold">
                                            {product.category}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(product); }} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                                            <Edit3 size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(product.id); }} className="p-2 rounded-lg bg-red-500/10 text-red-400">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <div>
                                        <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">매입단가 및 부대비용</div>
                                        <div className="text-sm font-bold text-slate-200 font-mono">{formatCurrency(product.unitPrice)}</div>
                                        <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                            <div>배송비: {formatCurrency(product.shippingCost)}</div>
                                            <div>포장비: {formatCurrency(product.packagingCost)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">최종 산출 원가</div>
                                        <div className="text-lg font-black text-primary-400 font-mono">{formatCurrency(finalCost)}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            정상 로스율 {product.lossRate}% 포함
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/[0.02]">
                                    <div className="flex gap-3">
                                        <span className="flex items-center gap-1"><Tag size={12} /> {product.spec || '-'}</span>
                                        <span className="flex items-center gap-1 font-bold text-primary-400/80"><Box size={12} /> {product.compositionQty}{product.compositionUnit}</span>
                                    </div>
                                    {product.bundleQty > 1 && <div className="text-[10px] text-primary-400/60">합포장: {product.bundleQty}개</div>}
                                </div>

                            </div>
                        );
                    }) : (
                        <div className="py-20 text-center opacity-20">
                            <p className="text-sm font-bold">등록된 상품이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>

        </div >
    );
}

// ----------------------------------------------------------------------------
// Section: Product Proposal / List
// ----------------------------------------------------------------------------

function ProductProposal({ products, onMarginUpdate, shippingRules }) {
    const [globalSupplyMargin, setGlobalSupplyMargin] = useState(20);
    const [globalSellMargin, setGlobalSellMargin] = useState(30);
    const [selectedIds, setSelectedIds] = useState([]);
    const [editStates, setEditStates] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleColumns, setVisibleColumns] = useState([
        'name', 'spec', 'proposalQty', 'composition', 'taxType', 'supplyPrice', 'sellingPrice', 'onlinePrice', 'remarks'
    ]);
    const [columnOrder, setColumnOrder] = useState([
        'image', 'name', 'spec', 'proposalQty', 'composition', 'taxType', 'supplyPrice', 'sellingPrice', 'onlinePrice', 'broadcastPrice', 'cartonQty', 'consumeLimit', 'shelfLife', 'barcode', 'remarks'
    ]);

    const [savedProposals, setSavedProposals] = useState(() => {
        try {
            const saved = localStorage.getItem('savedProposals');
            if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
            return initialData.proposals || [];
        } catch {
            return initialData.proposals || [];
        }
    });
    const [currentProposalId, setCurrentProposalId] = useState('');

    const saveProposal = () => {
        const existing = savedProposals.find(p => p.id === currentProposalId);
        const name = prompt('저장할 제안서/프로젝트 이름을 입력하세요:', existing ? existing.name : '');
        if (!name) return;

        let newList = [...savedProposals];
        const existingByName = newList.find(p => p.name === name);

        const newProposal = {
            id: existingByName ? existingByName.id : Date.now().toString(),
            name,
            globalSupplyMargin,
            globalSellMargin,
            selectedIds,
            editStates,
            visibleColumns,
            columnOrder,
            updatedAt: new Date().toISOString()
        };

        if (existingByName) {
            if (confirm(`'${name}'(이)라는 같은 이름의 제안서가 있습니다. 덮어씌우시겠습니까?`)) {
                newList = newList.map(p => p.id === existingByName.id ? newProposal : p);
            } else {
                return;
            }
        } else {
            newList.push(newProposal);
        }

        setSavedProposals(newList);
        setCurrentProposalId(newProposal.id);
        localStorage.setItem('savedProposals', JSON.stringify(newList));
        alert('제안서 프로젝트가 저장되었습니다.');
    };

    const loadProposal = (id) => {
        if (!id) return;
        const pData = savedProposals.find(p => p.id === id);
        if (!pData) return;
        if (confirm(`'${pData.name}' 제안서를 불러오시겠습니까? 현재 화면 내용은 덮어씌워집니다.`)) {
            setGlobalSupplyMargin(pData.globalSupplyMargin || 20);
            setGlobalSellMargin(pData.globalSellMargin || 30);
            setSelectedIds(pData.selectedIds || []);
            setEditStates(pData.editStates || {});
            setVisibleColumns(pData.visibleColumns || [
                'name', 'spec', 'proposalQty', 'composition', 'taxType', 'supplyPrice', 'sellingPrice', 'onlinePrice', 'remarks'
            ]);
            setColumnOrder(pData.columnOrder || [
                'image', 'name', 'spec', 'proposalQty', 'composition', 'taxType', 'supplyPrice', 'sellingPrice', 'onlinePrice', 'broadcastPrice', 'cartonQty', 'consumeLimit', 'shelfLife', 'barcode', 'remarks'
            ]);
            setCurrentProposalId(id);
        }
    };

    const deleteProposal = () => {
        if (!currentProposalId) return;
        if (confirm('현재 제안서 프로젝트를 완전히 삭제하시겠습니까?')) {
            const newList = savedProposals.filter(p => p.id !== currentProposalId);
            setSavedProposals(newList);
            localStorage.setItem('savedProposals', JSON.stringify(newList));
            setCurrentProposalId('');
            setSelectedIds([]);
            setEditStates({});
        }
    };

    const COLUMN_OPTIONS = [
        { key: 'image', label: '이미지' },
        { key: 'name', label: '상품명' },
        { key: 'spec', label: '규격' },
        { key: 'composition', label: '구성' },
        { key: 'taxType', label: '과세유형' },
        { key: 'supplyPrice', label: '공급가' },
        { key: 'sellingPrice', label: '판매가' },
        { key: 'onlinePrice', label: '온라인판매가' },
        { key: 'broadcastPrice', label: '방송단가' },
        { key: 'cartonQty', label: '카톤수량' },
        { key: 'consumeLimit', label: '소비기한' },
        { key: 'shelfLife', label: '유통기한' },
        { key: 'barcode', label: '바코드' },
        { key: 'remarks', label: '비고' },
        { key: 'proposalQty', label: '제안 수량' }
    ];

    const handleDragStart = (e, key) => {
        e.dataTransfer.setData('columnKey', key);
    };

    const handleDrop = (e, targetKey) => {
        const sourceKey = e.dataTransfer.getData('columnKey');
        if (sourceKey === targetKey) return;

        const newOrder = [...columnOrder];
        const sourceIndex = newOrder.indexOf(sourceKey);
        const targetIndex = newOrder.indexOf(targetKey);

        newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, sourceKey);
        setColumnOrder(newOrder);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const toggleColumn = (key) => {
        setVisibleColumns(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    const selectedProducts = useMemo(() => {
        return products
            .filter(p => {
                // 제안서 레이아웃에는 선택된 상품들만 표시함 (검색어와 무관하게 유지)
                return selectedIds.includes(p.id);
            })
            .map(p => {
                const sMargin = editStates[p.id]?.supplyMargin ?? globalSupplyMargin;
                const mMargin = editStates[p.id]?.sellMargin ?? globalSellMargin;
                const pQty = Number(editStates[p.id]?.proposalQty ?? 1);

                // 구성(composition)에서 단위 앞의 숫자(수량)만 추출하여 곱해줌
                const compStr = String(editStates[p.id]?.composition || p.compositionQty || 1);
                const compQtyMatch = compStr.match(/(\d+)/);
                const compQty = compQtyMatch ? parseInt(compQtyMatch[1], 10) : Number(p.compositionQty || 1);

                const totalQty = compQty * pQty;
                const baseCost = calculateFinalCost(p, shippingRules, totalQty);
                const totalCost = baseCost * totalQty;
                const pricing = calculatePrices(totalCost, sMargin, mMargin);

                // 만약 사용자가 '공급가'를 직접 수정했다면 그 값을 쓰고, 아니면 계산된 값을 씀
                const finalSupplyPrice = editStates[p.id]?.supplyPrice ?? pricing.supplyPrice;

                // 판매가는 '결정된 공급가' 대비 '판매가 마진'을 붙여야 함 
                // (만약 판매가도 직접 수정했다면 수정한 값을 씀)
                const mMarginFactor = 1 - (Number(mMargin) / 100);
                const calculatedSellPrice = mMarginFactor > 0
                    ? Math.round(finalSupplyPrice / mMarginFactor / 10) * 10
                    : finalSupplyPrice;

                const finalSellPrice = editStates[p.id]?.sellingPrice ?? calculatedSellPrice;

                return {
                    ...p,
                    ...editStates[p.id],
                    supplyMargin: sMargin,
                    sellMargin: mMargin,
                    supplyPrice: Number(finalSupplyPrice),
                    sellingPrice: Number(finalSellPrice),
                    onlinePrice: Number(editStates[p.id]?.onlinePrice ?? p.onlinePrice ?? 0),
                    calculatedCost: totalCost
                };
            });
    }, [products, selectedIds, globalSupplyMargin, globalSellMargin, editStates, shippingRules]);

    const tableTotals = useMemo(() => {
        const sums = {
            supplyPrice: 0,
            sellingPrice: 0,
            onlinePrice: 0,
            broadcastPrice: 0
        };
        selectedProducts.forEach(p => {
            if (p.supplyPrice) sums.supplyPrice += Number(p.supplyPrice);
            if (p.sellingPrice) sums.sellingPrice += Number(p.sellingPrice);
            if (p.onlinePrice) sums.onlinePrice += Number(p.onlinePrice);
            if (p.broadcastPrice) sums.broadcastPrice += Number(p.broadcastPrice);
        });
        return sums;
    }, [selectedProducts]);

    const matchingProducts = useMemo(() => {
        if (!searchQuery) return [];
        return products.filter(p =>
            (p.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
            (p.vendor || '').toLowerCase().includes((searchQuery || '').toLowerCase())
        ).slice(0, 10); // 최대 10개만 빠른 검색 결과로 표시
    }, [products, searchQuery]);

    const handleLocalEdit = (id, field, value) => {
        setEditStates(prev => {
            const newState = { ...prev };
            const productState = { ...(newState[id] || {}) };
            productState[field] = value;

            // 수량이나 구성이 변경되면 수동입력된 원가/판매가를 지워 자동 재계산되도록 함
            if (field === 'proposalQty' || field === 'composition') {
                delete productState.supplyPrice;
                delete productState.sellingPrice;
                delete productState.onlinePrice;
                delete productState.broadcastPrice;
            }

            newState[id] = productState;
            return newState;
        });
    };

    const handleExportExcel = () => {
        const data = selectedProducts
            .filter(p => selectedIds.includes(p.id))
            .map(p => {
                const row = {};
                columnOrder.forEach(key => {
                    if (visibleColumns.includes(key)) {
                        const col = COLUMN_OPTIONS.find(c => c.key === key);
                        let val = p[key];
                        if (key === 'name') val = p.productName ?? p.name;
                        row[col.label] = val || '';
                    }
                });
                return row;
            });
        exportToExcel(data, `ABAR_제안서_${new Date().toISOString().split('T')[0]}`);
    };

    const handleExportPDF = async () => {
        const customTitle = prompt('인쇄 및 PDF 제목을 입력하세요', 'ABAR 상품 제안서');
        if (customTitle === null) return;

        const element = document.getElementById('proposal-export-area');
        if (!element) return alert('출력할 영역을 찾을 수 없습니다.');

        const btn = document.activeElement;
        const originalText = btn.innerText;
        btn.innerText = 'PDF 생성 중...';
        btn.disabled = true;

        try {
            // Scroll to top for better capture
            window.scrollTo(0, 0);

            const originalStyle = element.style.cssText;
            const scrollArea = element.querySelector('.overflow-x-auto');
            const originalScrollStyle = scrollArea?.style.cssText || '';

            // Set temporary styles for high-quality capture
            element.style.background = 'white';
            element.style.color = 'black';
            element.style.padding = '20px';
            // Increase width to match content to avoid horizontal truncation
            // Force a minimum width for PDF table layout even on mobile
            const captureWidth = Math.max(scrollArea ? scrollArea.scrollWidth + 100 : 1200, 1200);
            element.style.width = `${captureWidth}px`;

            if (scrollArea) {
                scrollArea.style.overflow = 'visible';
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('proposal-export-area');
                    clonedElement.style.background = 'white';
                    clonedElement.style.color = 'black';
                    clonedElement.style.width = 'fit-content';
                    clonedElement.style.maxWidth = 'none';
                    clonedElement.style.overflow = 'visible';

                    // Hide no-print elements
                    clonedDoc.querySelectorAll('.no-print').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });

                    // Force Table view for PDF even on mobile
                    clonedDoc.querySelectorAll('.desktop-table').forEach(el => {
                        el.style.setProperty('display', 'block', 'important');
                        el.style.setProperty('overflow', 'visible', 'important');
                    });
                    clonedDoc.querySelectorAll('.mobile-cards').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });

                    // Force black text for all elements
                    const allText = clonedElement.querySelectorAll('*');
                    allText.forEach(el => {
                        const style = clonedDoc.defaultView?.getComputedStyle(el);
                        const color = style?.color;
                        if (color === 'rgb(255, 255, 255)' || (color && color.includes('rgba(255, 255, 255'))) {
                            el.style.setProperty('color', 'black', 'important');
                        }
                    });

                    const titleEl = clonedDoc.getElementById('print-title-header');
                    if (titleEl) {
                        titleEl.style.setProperty('display', 'block', 'important');
                        titleEl.style.setProperty('margin-top', '-20px', 'important');
                        titleEl.style.setProperty('margin-bottom', '15px', 'important');
                        titleEl.style.setProperty('font-size', '18px', 'important');
                        titleEl.style.setProperty('font-weight', '900', 'important');
                        titleEl.style.setProperty('color', '#0f172a', 'important');
                        titleEl.style.setProperty('text-align', 'left', 'important');
                    }

                    // Fix table styling for PDF
                    clonedElement.querySelectorAll('table').forEach(el => {
                        el.style.setProperty('border-collapse', 'collapse', 'important');
                        el.style.setProperty('border', '1px solid #cbd5e1', 'important');
                        el.style.setProperty('width', '100%', 'important');
                    });

                    // Lighter inner borders
                    clonedElement.querySelectorAll('td, th').forEach(el => {
                        el.style.setProperty('background', 'white', 'important');
                        el.style.setProperty('border', '1px solid #e2e8f0', 'important'); // Very light thin gray
                        el.style.setProperty('color', '#0f172a', 'important');
                        el.style.setProperty('font-size', '8.5px', 'important');
                        el.style.setProperty('padding', '4px 2px', 'important');
                    });

                    // Highlight headers: Bold, Centered
                    clonedElement.querySelectorAll('thead th').forEach(el => {
                        el.style.setProperty('background', '#f8fafc', 'important');
                        el.style.setProperty('font-weight', '900', 'important');
                        el.style.setProperty('text-align', 'center', 'important');
                        el.style.setProperty('color', '#0f172a', 'important');
                        el.style.setProperty('font-size', '9px', 'important');
                        el.style.setProperty('padding', '6px 2px', 'important');
                    });

                    // Footers
                    clonedElement.querySelectorAll('tfoot td, tfoot td span').forEach(el => {
                        el.style.setProperty('font-weight', '900', 'important');
                        el.style.setProperty('color', '#0f172a', 'important');
                    });

                    // Un-bold body row text (make it normal weight)
                    clonedElement.querySelectorAll('tbody td, tbody td span, tbody td div').forEach(el => {
                        el.style.setProperty('font-weight', '500', 'important');
                    });

                    // Clear img container background
                    clonedElement.querySelectorAll('td div.w-8').forEach(el => {
                        el.style.setProperty('background', 'transparent', 'important');
                        el.style.setProperty('border-color', 'transparent', 'important');
                    });

                    // Fix inputs and textareas by replacing them with DIVs to prevent html2canvas from cropping text
                    clonedElement.querySelectorAll('input, textarea, select').forEach(el => {
                        const wrapper = clonedDoc.createElement('div');
                        wrapper.textContent = el.value || '';
                        wrapper.className = el.className;

                        wrapper.style.setProperty('background', 'transparent', 'important');
                        wrapper.style.setProperty('border', 'none', 'important');
                        wrapper.style.setProperty('color', '#0f172a', 'important');
                        wrapper.style.setProperty('font-weight', '500', 'important'); // Normal font weight for inputs
                        wrapper.style.setProperty('font-size', '8.5px', 'important');
                        wrapper.style.setProperty('display', 'flex', 'important');
                        wrapper.style.setProperty('align-items', 'center', 'important');
                        wrapper.style.setProperty('min-height', 'auto', 'important');
                        wrapper.style.setProperty('padding', '2px 4px', 'important');

                        wrapper.style.setProperty('box-sizing', 'border-box', 'important');
                        wrapper.style.setProperty('overflow', 'visible', 'important');
                        wrapper.style.setProperty('line-height', '1.6', 'important');

                        if (el.tagName.toLowerCase() === 'textarea') {
                            wrapper.style.setProperty('align-items', 'flex-start', 'important');
                            wrapper.style.setProperty('white-space', 'pre-wrap', 'important');
                            wrapper.style.setProperty('height', 'auto', 'important');
                        } else {
                            wrapper.style.setProperty('white-space', 'nowrap', 'important');
                        }

                        if (el.className.includes('text-right')) {
                            wrapper.style.setProperty('justify-content', 'flex-end', 'important');
                        } else if (el.className.includes('text-center')) {
                            wrapper.style.setProperty('justify-content', 'center', 'important');
                        }

                        el.parentNode.replaceChild(wrapper, el);
                    });

                    // Show title
                    const titleHeader = clonedDoc.getElementById('print-title-header');
                    if (titleHeader) {
                        titleHeader.style.display = 'block';
                        titleHeader.style.color = 'black';
                        titleHeader.textContent = customTitle;
                    }

                    // Ensure overflow visible in clone
                    const clonedScrollArea = clonedElement.querySelector('.overflow-x-auto');
                    if (clonedScrollArea) {
                        clonedScrollArea.style.overflow = 'visible';
                        clonedScrollArea.style.width = 'auto';
                        clonedScrollArea.style.maxWidth = 'none';
                    }
                }
            });

            // Restore original style
            element.style.cssText = originalStyle;
            if (scrollArea) scrollArea.style.cssText = originalScrollStyle;

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            // Detect orientation based on canvas aspect ratio
            const isLandscape = canvas.width > canvas.height;
            const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const marginX = 10;
            const marginY = 10;
            const contentWidth = pageWidth - (marginX * 2);
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = marginY;

            // Page 1
            pdf.addImage(imgData, 'JPEG', marginX, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= (pageHeight - marginY * 2);

            // Add more pages
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + marginY;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', marginX, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= (pageHeight - marginY * 2);
            }

            pdf.save(`ABAR_상품제안서_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('PDF 생성 중 오류가 발생했습니다.');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white">상품리스트 & 제안서</h2>
                    <p className="text-slate-400 text-sm mt-1">마진율 시뮬레이션 및 데이터 편집 출력</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className="input-field h-12 min-w-[200px] bg-indigo-900/20 border-indigo-500/30 text-indigo-200"
                        value={currentProposalId || ''}
                        onChange={(e) => {
                            if (e.target.value) {
                                loadProposal(e.target.value);
                            } else {
                                setCurrentProposalId('');
                                setSelectedIds([]);
                                setEditStates({});
                            }
                        }}
                    >
                        <option value="">✨ 새 제안서 작성...</option>
                        {savedProposals.map(p => <option key={p.id} value={p.id}>{p.name} ({new Date(p.updatedAt).toLocaleDateString()})</option>)}
                    </select>
                    <button className="btn-secondary h-12 px-4 flex items-center justify-center gap-2 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500 hover:text-white" onClick={saveProposal} title="현재 제안서 저장">
                        <Save size={18} /> <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Save</span>
                    </button>
                    {currentProposalId && (
                        <button className="btn-secondary h-12 px-4 flex items-center justify-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" onClick={deleteProposal} title="현재 제안서 삭제">
                            <Trash2 size={18} />
                        </button>
                    )}

                    <div className="w-px h-8 bg-white/10 mx-2 hidden md:block"></div>

                    <button className="btn-secondary h-12" onClick={() => window.print()} disabled={selectedIds.length === 0}>
                        <Printer size={18} /> 인쇄하기
                    </button>
                    <button className="btn-secondary h-12" onClick={handleExportPDF} disabled={selectedIds.length === 0}>
                        <FileText size={18} /> PDF 저장
                    </button>
                    <button className="btn-primary h-12" onClick={handleExportExcel} disabled={selectedIds.length === 0}>
                        <Download size={18} /> Excel 출력
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                <div id="proposal-export-area">
                    {/* 상단 통합 컨트롤 바 (no-print) */}
                    <div className="no-print space-y-4 mb-8">
                        <div className="glass-panel p-6 shadow-xl shadow-primary-500/5">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* 출력 항목 선택 및 순서 */}
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ArrowRightLeft size={14} className="text-primary-500" />
                                        출력 항목 선택 및 표시 순서 (드래그하여 정렬)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {columnOrder.map((key) => {
                                            const col = COLUMN_OPTIONS.find(c => c.key === key);
                                            const isVisible = visibleColumns.includes(key);
                                            return (
                                                <div
                                                    key={key}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, key)}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, key)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-move select-none",
                                                        isVisible
                                                            ? "bg-primary-600/20 border-primary-500/40 text-primary-400"
                                                            : "bg-slate-800/50 border-white/5 text-slate-500 opacity-50"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isVisible}
                                                        onChange={() => toggleColumn(key)}
                                                        className="w-3.5 h-3.5 rounded-sm border-slate-600 bg-slate-900 text-primary-500"
                                                    />
                                                    {col.label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 마진율 시뮬레이터 (공간 효율화) */}
                                <div className="xl:col-span-2 space-y-4 bg-white/5 rounded-2xl p-5 border border-white/5">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-lg bg-primary-400/20 flex items-center justify-center">
                                            <Tag size={14} className="text-primary-400" />
                                        </div>
                                        마진 시뮬레이션
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">공급가 마진</span>
                                                <span className="text-primary-500 font-mono font-bold">{globalSupplyMargin}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100"
                                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                                value={globalSupplyMargin}
                                                onChange={(e) => setGlobalSupplyMargin(Number(e.target.value))}
                                            />
                                            <button
                                                className="w-full py-1.5 text-[10px] bg-primary-500/10 text-primary-400 rounded-md border border-primary-500/20 hover:bg-primary-500/20 transition-all font-bold"
                                                onClick={() => {
                                                    if (confirm('공급가 마진을 일괄 적용하시겠습니까?')) {
                                                        const newEdits = { ...editStates };
                                                        products.forEach(p => { newEdits[p.id] = { ...newEdits[p.id], supplyMargin: globalSupplyMargin }; });
                                                        setEditStates(newEdits);
                                                    }
                                                }}
                                            >공급가 마진 일괄 적용</button>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">판매가 마진</span>
                                                <span className="text-primary-400 font-mono font-bold">{globalSellMargin}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100"
                                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-400"
                                                value={globalSellMargin}
                                                onChange={(e) => setGlobalSellMargin(Number(e.target.value))}
                                            />
                                            <button
                                                className="w-full py-1.5 text-[10px] bg-primary-400/10 text-primary-400 rounded-md border border-primary-400/20 hover:bg-primary-400/20 transition-all font-bold"
                                                onClick={() => {
                                                    if (confirm('판매가 마진을 일괄 적용하시겠습니까?')) {
                                                        const newEdits = { ...editStates };
                                                        products.forEach(p => { newEdits[p.id] = { ...newEdits[p.id], sellMargin: globalSellMargin }; });
                                                        setEditStates(newEdits);
                                                    }
                                                }}
                                            >판매가 마진 일괄 적용</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 요약 대시보드 (no-print) */}
                        <div className="flex flex-wrap items-center justify-between p-5 bg-[#1e293b]/50 rounded-2xl border border-white/5 gap-4">
                            <div className="flex items-center gap-8">
                                <div className="space-y-1">
                                    <span className="text-[9px] text-slate-500 font-black uppercase block">선택 품목</span>
                                    <span className="text-white font-black text-xl leading-none">{selectedIds.length}<span className="text-xs font-normal text-slate-400 ml-1">개</span></span>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="space-y-1">
                                    <span className="text-[9px] text-slate-500 font-black uppercase block">총 제안가 합계</span>
                                    <span className="text-primary-400 font-mono font-black text-xl leading-none">
                                        {formatCurrency(selectedProducts.reduce((acc, p) => acc + p.sellingPrice, 0))}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-xl">
                                <Search className={cn("transition-all", searchQuery ? "text-primary-500" : "text-slate-700")} size={14} />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{searchQuery ? `'${searchQuery}' (필터됨)` : '전체 상품 목록'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="print-title-header" className="print-title">ABAR 상품 제안서</div>
                    <div className="glass-panel overflow-visible">
                        <div className="p-4 bg-white/5 border-b border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 no-print relative">
                            <div className="relative flex-1 group">
                                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 transition-colors", searchQuery ? "text-primary-500" : "text-slate-500")} size={16} />
                                <input
                                    className="input-field w-full pl-10 h-11 text-sm bg-slate-900/50 border-white/10 focus:border-primary-500/50"
                                    placeholder="상품명 또는 업체명으로 상품 찾기..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {matchingProducts.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 glass-panel z-[60] shadow-2xl border-primary-500/20 max-h-[400px] overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-2 border-b border-white/5 flex justify-between items-center bg-white/5">
                                            <span className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">검색 결과 ({matchingProducts.length})</span>
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                                            >닫기</button>
                                        </div>
                                        <div className="divide-y divide-white/5">
                                            {matchingProducts.map(p => {
                                                const isSelected = selectedIds.includes(p.id);
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleSelect(p.id);
                                                            setSearchQuery('');
                                                        }}
                                                        className={cn(
                                                            "p-3 flex items-center gap-4 cursor-pointer transition-all hover:bg-white/10",
                                                            isSelected ? "bg-primary-500/10" : ""
                                                        )}
                                                    >
                                                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                                                            {p.imageUrl ? (
                                                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-lg opacity-20">🖼️</div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] text-primary-400 font-bold mb-0.5">{p.vendor}</div>
                                                            <div className="text-sm font-black text-white truncate">{p.name}</div>
                                                            <div className="text-[10px] text-slate-500 truncate">{p.spec}</div>
                                                        </div>
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                                                            isSelected ? "bg-primary-500 border-primary-400 text-white" : "border-white/10 text-slate-600"
                                                        )}>
                                                            {isSelected ? <Check size={16} /> : <Plus size={16} />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="p-2 bg-primary-500/5 text-center">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const newIds = [...new Set([...selectedIds, ...matchingProducts.map(p => p.id)])];
                                                    setSelectedIds(newIds);
                                                    setSearchQuery('');
                                                }}
                                                className="text-[11px] font-black text-primary-400 py-1 hover:text-primary-300 w-full"
                                            >검색된 {matchingProducts.length}개 상품 모두 추가</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { if (confirm('모든 품목을 해제하시겠습니까?')) setSelectedIds([]); }}
                                    className="btn-secondary h-11 px-4 text-xs font-bold border-red-500/20 text-red-400 hover:bg-red-500/10"
                                >
                                    <Trash2 size={14} /> 선택 초기화
                                </button>
                                <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />
                                <div className="text-right hidden sm:block lg:min-w-[120px]">
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-right">활성 제안서</div>
                                    <div className="text-primary-400 font-mono font-black text-sm">{selectedIds.length}개 품목 구성 중</div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto desktop-table hidden lg:block border border-white/5 bg-white/[0.01] rounded-2xl shadow-2xl">
                            <table className="w-full text-left whitespace-nowrap text-sm">
                                <thead className="bg-white/[0.02] border-b border-white/10 text-[10px] uppercase font-black tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-2 py-2 w-8 text-center no-print">✔</th>
                                        {visibleColumns.includes('image') && <th className="px-2 py-2 w-12 text-center">IMG</th>}
                                        {visibleColumns.includes('name') && <th className="px-2 py-2 min-w-[200px]">상품명</th>}
                                        {columnOrder.filter(key => visibleColumns.includes(key) && key !== 'image' && key !== 'name').map(key => {
                                            const col = COLUMN_OPTIONS.find(c => c.key === key);
                                            return <th key={key} className="px-2 py-2 text-right">{col?.label}</th>;
                                        })}
                                        <th className="px-2 py-2 w-8 text-center no-print"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {selectedProducts.map(p => {
                                        const isSelected = selectedIds.includes(p.id);
                                        const editState = editStates[p.id] || {};
                                        const extraColumns = columnOrder.filter(key =>
                                            visibleColumns.includes(key) && key !== 'image' && key !== 'name'
                                        );

                                        return (
                                            <tr key={p.id} className={cn(
                                                "transition-colors group",
                                                isSelected ? "bg-primary-500/5 hover:bg-primary-500/10" : "hover:bg-white/[0.02]"
                                            )}>
                                                {/* Checkbox */}
                                                <td className="px-2 py-1.5 text-center align-middle no-print">
                                                    <div className="w-3.5 h-3.5 mx-auto rounded-sm border border-primary-500/50 flex items-center justify-center bg-primary-500/10 text-primary-500">
                                                        <Check size={8} strokeWidth={4} />
                                                    </div>
                                                </td>

                                                {/* Image */}
                                                {visibleColumns.includes('image') && (
                                                    <td className="px-2 py-1.5 align-middle">
                                                        <div className="w-8 h-8 rounded border border-white/10 flex items-center justify-center overflow-hidden bg-white/5 shadow-sm mx-auto">
                                                            {p.imageUrl ? (
                                                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[8px] opacity-30">🖼️</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                {/* Name */}
                                                {visibleColumns.includes('name') && (
                                                    <td className="px-2 py-1 align-middle min-w-[280px] max-w-[350px] whitespace-normal">
                                                        <textarea
                                                            className="bg-transparent border-none outline-none font-bold text-white text-[12px] w-full resize-none leading-tight focus:ring-1 focus:ring-primary-500/50 rounded transition-all"
                                                            value={editState.productName ?? p.name}
                                                            rows={2}
                                                            onChange={(e) => handleLocalEdit(p.id, 'productName', e.target.value)}
                                                        />
                                                    </td>
                                                )}

                                                {/* Dynamic Properties */}
                                                {extraColumns.map(key => {
                                                    let cellValue = editState[key] ?? p[key];
                                                    if (key === 'composition' && !editState[key]) {
                                                        cellValue = `${p.compositionQty || 0}${p.compositionUnit || '개'}`;
                                                    }
                                                    const isPrice = ['supplyPrice', 'sellingPrice', 'onlinePrice', 'broadcastPrice'].includes(key);

                                                    return (
                                                        <td key={key} className="px-2 py-1.5 align-middle text-right max-w-[120px]">
                                                            {isPrice || ['cartonQty', 'proposalQty'].includes(key) ? (
                                                                <input
                                                                    type="number"
                                                                    className={cn(
                                                                        "bg-transparent border border-transparent hover:border-white/10 rounded px-1 py-1 w-full text-right font-mono text-[11px] focus:bg-slate-900 focus:border-primary-500 transition-all",
                                                                        key === 'sellingPrice' ? "text-primary-400 font-black text-xs" : "font-bold text-slate-300"
                                                                    )}
                                                                    value={cellValue || 0}
                                                                    onChange={(e) => handleLocalEdit(p.id, key, Number(e.target.value))}
                                                                />
                                                            ) : key === 'remarks' ? (
                                                                <textarea
                                                                    className="bg-transparent border border-transparent hover:border-white/10 rounded px-1 py-1 w-[140px] text-left text-[11px] text-slate-300 focus:bg-slate-900 focus:border-primary-500 transition-all resize-none"
                                                                    value={cellValue ?? ''}
                                                                    placeholder="..."
                                                                    rows={2}
                                                                    onChange={(e) => handleLocalEdit(p.id, key, e.target.value)}
                                                                />
                                                            ) : (
                                                                <input
                                                                    className="bg-transparent border border-transparent hover:border-white/10 rounded px-1 py-1 w-full text-center text-[11px] text-slate-300 focus:bg-slate-900 focus:border-primary-500 transition-all"
                                                                    value={cellValue ?? ''}
                                                                    onChange={(e) => handleLocalEdit(p.id, key, e.target.value)}
                                                                />
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Remove Button */}
                                                <td className="px-2 py-1.5 text-center align-middle no-print w-8">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleSelect(p.id);
                                                        }}
                                                        className="p-1 rounded bg-red-500/10 text-red-500 opacity-20 hover:opacity-100 hover:bg-red-500 hover:text-white transition-all transform active:scale-95"
                                                        title="제거"
                                                    >
                                                        <X size={12} strokeWidth={3} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-primary-950 font-black tracking-tight border-t-2 border-primary-500 text-[11px]">
                                    <tr>
                                        <td className="px-2 py-3 text-center no-print border-t border-primary-500/50"></td>
                                        {visibleColumns.includes('image') && <td className="px-2 py-3 border-t border-primary-500/50"></td>}
                                        {visibleColumns.includes('name') && <td className="px-2 py-3 text-right text-primary-300 font-bold uppercase tracking-widest border-t border-primary-500/50">합계 (Totals)</td>}
                                        {columnOrder.filter(key => visibleColumns.includes(key) && key !== 'image' && key !== 'name').map(key => {
                                            const isPrice = ['supplyPrice', 'sellingPrice', 'onlinePrice', 'broadcastPrice'].includes(key);
                                            return (
                                                <td key={key} className="px-2 py-3 text-right border-t border-primary-500/50">
                                                    {isPrice ? (
                                                        <span className={key === 'sellingPrice' ? "text-primary-300 font-black text-xs" : "text-white font-bold text-[11px]"}>
                                                            {formatCurrency(tableTotals[key] || 0)}
                                                        </span>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                        <td className="px-2 py-3 text-center no-print border-t border-primary-500/50"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="mobile-cards p-4 space-y-4 lg:hidden">
                            {selectedProducts.map(p => {
                                const isSelected = selectedIds.includes(p.id);
                                const editState = editStates[p.id] || {};
                                return (
                                    <div key={p.id} className={cn(
                                        "glass-panel p-4 space-y-4 border-l-4 transition-all no-print relative",
                                        isSelected ? "border-l-primary-500 bg-primary-600/10 shadow-lg scale-[1.01]" : "border-l-transparent"
                                    )}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleSelect(p.id);
                                            }}
                                            className="absolute top-2 right-2 p-2 rounded-full bg-red-500/10 text-red-500 active:bg-red-500 active:text-white transition-all z-10"
                                        >
                                            <X size={14} />
                                        </button>

                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 w-5 h-5 rounded border border-primary-500/50 flex items-center justify-center bg-primary-500/10 text-primary-500">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                            <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl opacity-30">🖼️</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-1 truncate">
                                                    {p.vendor} | {p.category}
                                                </div>
                                                <textarea
                                                    className="line-edit-input font-black text-white text-sm leading-tight hover:bg-white/5"
                                                    value={editState.productName ?? p.name}
                                                    rows={2}
                                                    onChange={(e) => handleLocalEdit(p.id, 'productName', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 font-black uppercase">공급가액</label>
                                                <input
                                                    type="number"
                                                    className="bg-slate-900/50 border border-white/5 rounded px-2 py-1.5 w-full text-right font-mono font-bold text-primary-400 text-sm"
                                                    value={editState.supplyPrice ?? p.supplyPrice ?? p.unitPrice}
                                                    onChange={(e) => handleLocalEdit(p.id, 'supplyPrice', Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 font-black uppercase">제안가</label>
                                                <input
                                                    type="number"
                                                    className="bg-slate-900/50 border border-white/5 rounded px-2 py-1.5 w-full text-right font-mono font-bold text-primary-500 text-sm"
                                                    value={editState.sellingPrice ?? p.sellingPrice ?? (p.unitPrice * 1.25)}
                                                    onChange={(e) => handleLocalEdit(p.id, 'sellingPrice', Number(e.target.value))}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] px-1 text-slate-400 font-bold">
                                            <div className="flex items-center gap-1.5 truncate pr-2">
                                                <Tag size={12} className="text-slate-600 flex-shrink-0" />
                                                <span className="truncate">{p.spec}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-primary-400 font-black flex-shrink-0">
                                                <Box size={12} className="opacity-50" />
                                                <span>{p.compositionQty || 1}{p.compositionUnit || '개'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {selectedProducts.length === 0 && (
                                <div className="p-12 text-center glass-panel opacity-30">
                                    <Search size={48} className="mx-auto mb-4" />
                                    <p className="font-bold text-sm">표시할 상품이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------
// Modal: Product Detail Editor
// ----------------------------------------------------------------------------

function ProductModal({ product, categories, onSave, onClose, shippingRules }) {
    const [formData, setFormData] = useState(product || {
        id: Date.now().toString(),
        vendor: '',
        name: '',
        category: categories[0],
        spec: '',
        composition: '',
        compositionQty: 1,
        compositionUnit: '개',
        unitPrice: 0,
        shippingCost: 0,
        shippingPresetId: '',
        packagingCost: 0,
        bundleQty: 1,
        t1Qty: 0, t1Cost: 0,
        t2Qty: 0, t2Cost: 0,
        t3Qty: 0, t3Cost: 0,
        lossRate: 0,
        otherCosts: 0,
        taxType: '면세',
        marginRate: 20,
        inboxQty: 0,
        outboxQty: 0,
        cartonQty: 0,
        consumeLimit: '',
        shelfLife: '',
        barcode: '',
        remarks: '',
        onlinePrice: 0,
        imageUrl: '',
        updatedAt: new Date().toISOString()
    });

    const calculatedCost = useMemo(() => calculateFinalCost(formData, shippingRules, 1), [formData, shippingRules]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imageUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, imageUrl: reader.result }));
                };
                reader.readAsDataURL(blob);
            }
        }
    };

    const handleChange = (field, value) => {
        if (field === 'shippingPresetId') {
            const rule = shippingRules.find(r => r.id === value);
            setFormData(prev => ({
                ...prev,
                shippingPresetId: value,
                shippingCost: rule ? rule.cost : prev.shippingCost
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative glass-panel w-full max-w-4xl bg-[#0f172a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-600 p-2 rounded-lg">
                            <Edit3 className="text-white" size={18} />
                        </div>
                        <h3 className="text-xl font-black">{product.id ? '상품 정보 수정' : '신규 상품 등록'}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {/* Section: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-primary-500 uppercase tracking-widest flex items-center gap-2">
                                <Package size={14} /> 기본 정보
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">업체명</label>
                                    <input
                                        type="text" className="input-field w-full"
                                        value={formData.vendor} onChange={(e) => handleChange('vendor', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">제품명</label>
                                    <input
                                        type="text" className="input-field w-full"
                                        value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold mb-1 block">카테고리</label>
                                        <select
                                            className="input-field w-full"
                                            value={formData.category} onChange={(e) => handleChange('category', e.target.value)}
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold mb-1 block">과세유형</label>
                                        <select
                                            className="input-field w-full"
                                            value={formData.taxType} onChange={(e) => handleChange('taxType', e.target.value)}
                                        >
                                            {['과세', '면세', '영세', '기타'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-primary-500 uppercase tracking-widest flex items-center gap-2">
                                <Truck size={14} /> 물류 및 규격
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">규격</label>
                                    <input type="text" className="input-field w-full" placeholder="예: 500g * 10입" value={formData.spec} onChange={(e) => handleChange('spec', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold mb-1 block">구성 수량</label>
                                        <input type="number" className="input-field w-full" value={formData.compositionQty} onChange={(e) => handleChange('compositionQty', Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold mb-1 block">단위</label>
                                        <select
                                            className="input-field w-full"
                                            value={formData.compositionUnit}
                                            onChange={(e) => handleChange('compositionUnit', e.target.value)}
                                        >
                                            <option value="개">개</option>
                                            <option value="세트">세트</option>
                                            <option value="매수">매수</option>
                                            <option value="박스">박스</option>
                                            <option value="포">포</option>
                                            <option value="병">병</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">인박스 수량</label>
                                    <input type="number" className="input-field w-full" value={formData.inboxQty} onChange={(e) => handleChange('inboxQty', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">아웃박스 수량</label>
                                    <input type="number" className="input-field w-full" value={formData.outboxQty} onChange={(e) => handleChange('outboxQty', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">카톤 단위 수량</label>
                                    <input type="number" className="input-field w-full" value={formData.cartonQty} onChange={(e) => handleChange('cartonQty', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">소비기한</label>
                                    <input type="text" className="input-field w-full" placeholder="예: 제조일로부터 12개월" value={formData.consumeLimit} onChange={(e) => handleChange('consumeLimit', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">유통기한</label>
                                    <input type="text" className="input-field w-full" value={formData.shelfLife} onChange={(e) => handleChange('shelfLife', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold mb-1 block">바코드</label>
                                    <input type="text" className="input-field w-full text-xs" value={formData.barcode} onChange={(e) => handleChange('barcode', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold mb-1 block">온라인 판매가 (참고용)</label>
                                        <input type="number" className="input-field w-full text-primary-400 font-bold" value={formData.onlinePrice || 0} onChange={(e) => handleChange('onlinePrice', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold mb-1 block">상품 이미지 (파일 업로드 또는 붙여넣기)</label>
                                        <div
                                            className="relative h-10 border border-white/10 rounded-xl bg-white/5 flex items-center px-3 gap-2 overflow-hidden hover:border-primary-500/50 transition-all cursor-pointer group"
                                            onPaste={handlePaste}
                                            onClick={() => document.getElementById('image-upload-input').click()}
                                        >
                                            <div className="bg-primary-500/20 p-1.5 rounded-lg text-primary-400">
                                                <Upload size={14} />
                                            </div>
                                            <span className="text-[10px] text-slate-500 truncate flex-1">
                                                {formData.imageUrl ? '이미지 등록 완료 (클릭하여 변경)' : '파일 선택 또는 Ctrl+V로 붙여넣기'}
                                            </span>
                                            {formData.imageUrl && (
                                                <div className="w-8 h-8 rounded border border-white/10 overflow-hidden">
                                                    <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                                </div>
                                            )}
                                            <input
                                                id="image-upload-input" type="file" className="hidden" accept="image/*"
                                                onChange={handleImageUpload}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 pt-4">
                                    <label className="text-xs text-primary-500/80 font-black uppercase tracking-widest mb-2 block">비고 (제안서 자동 포함)</label>
                                    <textarea
                                        className="input-field w-full h-24 py-3 text-xs resize-none"
                                        placeholder="제안서에 표시될 추가 정보를 입력하세요."
                                        value={formData.remarks} onChange={(e) => handleChange('remarks', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Section: Cost Calculation */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-black text-primary-500 uppercase tracking-widest flex items-center gap-2">
                            <Calculator size={14} /> 원가 및 비용 설정
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <label className="text-xs text-slate-500 font-bold mb-1 block">매입단가 (순수)</label>
                                <input
                                    type="number" className="input-field w-full h-12 text-lg font-mono font-bold"
                                    value={formData.unitPrice} onChange={(e) => handleChange('unitPrice', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-orange-500 font-bold mb-1 block italic animate-pulse">방송 단가 (특별)</label>
                                <input
                                    type="number" className="input-field w-full h-12 text-lg font-mono font-bold text-orange-400 border-orange-500/30"
                                    value={formData.broadcastPrice} onChange={(e) => handleChange('broadcastPrice', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold mb-1 block italic text-primary-400">배송비 프리셋</label>
                                <select
                                    className="input-field w-full h-12 text-xs mb-2"
                                    value={formData.shippingPresetId}
                                    onChange={(e) => handleChange('shippingPresetId', e.target.value)}
                                >
                                    <option value="">수동 입력</option>
                                    <optgroup label="업체별">
                                        {shippingRules.filter(r => r.type === 'carrier').map(r => (
                                            <option key={r.id} value={r.id}>{r.label} ({formatCurrency(r.cost)})</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="무게/규모별">
                                        {shippingRules.filter(r => r.type === 'weight').map(r => (
                                            <option key={r.id} value={r.id}>{r.label} ({formatCurrency(r.cost)})</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="수량별">
                                        {shippingRules.filter(r => r.type === 'quantity').map(r => (
                                            <option key={r.id} value={r.id}>{r.label} ({formatCurrency(r.cost)})</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <input
                                    type="number" className="input-field w-full h-10 font-mono text-sm"
                                    placeholder="직접 입력"
                                    value={formData.shippingCost}
                                    onChange={(e) => handleChange('shippingCost', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold mb-1 block">포장비</label>
                                <input
                                    type="number" className="input-field w-full h-12"
                                    value={formData.packagingCost} onChange={(e) => handleChange('packagingCost', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-primary-400 font-bold mb-1 block truncate">고정비 기준수량 (합포장)</label>
                                <input
                                    type="number" className="input-field w-full h-12 border-primary-500/30 font-mono"
                                    value={formData.bundleQty || ''} onChange={(e) => handleChange('bundleQty', Number(e.target.value))}
                                    placeholder="기본: 1개"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold mb-1 block">로스율 (%)</label>
                                <input
                                    type="number" className="input-field w-full h-12"
                                    value={formData.lossRate} onChange={(e) => handleChange('lossRate', Number(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Tiered Shipping Section */}
                        <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-6 space-y-4">
                            <h5 className="text-[10px] font-black text-primary-400 uppercase tracking-widest flex items-center gap-2">
                                <Box size={14} /> 단계별 배송비 설정 (설정 시 우선 적용)
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-400 font-bold block">1단계 (소량)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" className="input-field flex-1 h-10 text-xs font-mono px-2" placeholder="수량" value={formData.t1Qty || ''} onChange={e => handleChange('t1Qty', Number(e.target.value))} />
                                        <input type="number" className="input-field flex-1 h-10 text-xs font-mono px-2" placeholder="금액" value={formData.t1Cost || ''} onChange={e => handleChange('t1Cost', Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-400 font-bold block">2단계 (중량)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" className="input-field flex-1 h-10 text-xs font-mono px-2" placeholder="수량" value={formData.t2Qty || ''} onChange={e => handleChange('t2Qty', Number(e.target.value))} />
                                        <input type="number" className="input-field flex-1 h-10 text-xs font-mono px-2" placeholder="금액" value={formData.t2Cost || ''} onChange={e => handleChange('t2Cost', Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-400 font-bold block">3단계 (풀박스)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" className="input-field flex-1 h-10 text-xs font-mono px-2" placeholder="수량" value={formData.t3Qty || ''} onChange={e => handleChange('t3Qty', Number(e.target.value))} />
                                        <input type="number" className="input-field flex-1 h-10 text-xs font-mono px-2" placeholder="금액" value={formData.t3Cost || ''} onChange={e => handleChange('t3Cost', Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-primary-500/70 italic">※ 3단계(최대수량) 초과 시 박스가 추가로 분할되어 계산됩니다.</p>
                        </div>

                        <div className="bg-white/5 p-6 rounded-2xl flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary-600/20 flex items-center justify-center">
                                    <Calculator className="text-primary-400" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Calculated Final Cost</div>
                                    <div className="text-3xl font-black text-primary-400 font-mono italic tracking-tighter">
                                        {formatCurrency(calculatedCost)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-500">기본 마진 {formData.marginRate}% 적용 시</span>
                                <div className="text-xl font-bold text-white font-mono">
                                    {formatCurrency(calculatePrices(calculatedCost, formData.marginRate, formData.taxType === '면세' ? 'free' : 'taxable').sellingPrice)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
                    <button onClick={onClose} className="btn-secondary">취소</button>
                    <button onClick={() => onSave(formData)} className="btn-primary px-8">
                        <Save size={18} /> 저장하기
                    </button>
                </div>
            </div>
        </div>
    );
}

function HomeShoppingAnalysis({ channels, setChannels, products }) {
    const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
    const [productSearchTerm, setProductSearchTerm] = useState('');

    const [savedProjects, setSavedProjects] = useState(() => {
        try {
            const saved = localStorage.getItem('hsProjects');
            if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
            return initialData.hs_projects || [];
        } catch {
            return initialData.hs_projects || [];
        }
    });

    const selectedProduct = useMemo(() => {
        return products.find(p => p.id === selectedProductId);
    }, [products, selectedProductId]);

    const [extraCosts, setExtraCosts] = useState(() => {
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return {
            sellingPrice: 0, qty: 1, modelFeeFixed: 0, modelFeePerUnit: 0, modelFeeRate: 0, lossRate: 0, packagingCost: 0, deliveryCost: 0, otherCost: 0
        };
        return {
            sellingPrice: product.broadcastPrice || product.sellingPrice || product.unitPrice * 1.5 || 0,
            qty: product.compositionQty || 1,
            modelFeeFixed: 0,
            modelFeePerUnit: 0,
            modelFeeRate: 0,
            lossRate: product.lossRate || 0,
            packagingCost: product.packagingCost || 0,
            deliveryCost: product.shippingCost || 0,
            otherCost: product.otherCosts || 0
        };
    });

    const handleProductChange = (newId) => {
        setSelectedProductId(newId);
        const product = products.find(p => p.id === newId);
        if (product) {
            setExtraCosts({
                sellingPrice: product.broadcastPrice || product.sellingPrice || product.unitPrice * 1.5 || 0,
                qty: product.compositionQty || 1,
                modelFeeFixed: 0,
                modelFeePerUnit: 0,
                modelFeeRate: 0,
                lossRate: product.lossRate || 0,
                packagingCost: product.packagingCost || 0,
                deliveryCost: product.shippingCost || 0,
                otherCost: product.otherCosts || 0
            });
        }
    };

    const productCost = useMemo(() => {
        if (!selectedProduct) return 0;
        let baseCost = (selectedProduct.unitPrice * Number(extraCosts.qty || 1)) + Number(extraCosts.packagingCost || 0) + Number(extraCosts.deliveryCost || 0) + Number(extraCosts.otherCost || 0);
        if (extraCosts.lossRate > 0) {
            baseCost = baseCost / (1 - (Number(extraCosts.lossRate) / 100));
        }
        return baseCost;
    }, [selectedProduct, extraCosts]);

    const productPrice = Number(extraCosts.sellingPrice) || 0;

    const addChannel = () => {
        const name = prompt('홈쇼핑사 이름을 입력하세요');
        if (name) {
            setChannels([...channels, {
                id: Date.now().toString(),
                name,
                fixedFee: 0,
                commission: 20,
                deliveryCost: 2500,
                goalAmount: 100000000,
                confirmedRate: 83,
                celebCost: 2000000,
                remarks: ''
            }]);
        }
    };

    const updateChannel = (id, field, value) => {
        setChannels(channels.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const removeChannel = (id) => {
        if (confirm('이 채널을 삭제하시겠습니까?')) {
            setChannels(channels.filter(c => c.id !== id));
        }
    };

    const updateExtraCost = (k, v) => setExtraCosts(prev => ({ ...prev, [k]: v }));

    const saveProject = () => {
        const name = prompt('저장할 프로젝트/시나리오 이름을 입력하세요:');
        if (!name) return;
        const newProject = {
            id: Date.now().toString(),
            name,
            selectedProductId,
            extraCosts,
            channels,
            updatedAt: new Date().toISOString()
        };
        const newList = [...savedProjects, newProject];
        setSavedProjects(newList);
        localStorage.setItem('hsProjects', JSON.stringify(newList));
        alert('프로젝트가 저장되었습니다.');
    };

    const loadProject = (projectStr) => {
        if (!projectStr) return;
        const pData = savedProjects.find(p => p.id === projectStr);
        if (!pData) return;
        if (confirm(`'${pData.name}' 시나리오를 불러오시겠습니까? 현재 설정은 덮어씌워집니다.`)) {
            setSelectedProductId(pData.selectedProductId);
            setExtraCosts(pData.extraCosts);
            setChannels(pData.channels);
        }
    };

    const deleteProject = (id, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (confirm('이 저장된 프로젝트를 삭제하시겠습니까?')) {
            const newList = savedProjects.filter(p => p.id !== id);
            setSavedProjects(newList);
            localStorage.setItem('hsProjects', JSON.stringify(newList));
        }
    };

    const filteredProductsForSelect = useMemo(() => {
        if (!productSearchTerm) return products;
        const lowSearch = productSearchTerm.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(lowSearch) ||
            p.vendor.toLowerCase().includes(lowSearch)
        );
    }, [products, productSearchTerm]);

    const achievementRates = [0.6, 0.7, 0.8, 0.9, 1.0];

    const calculateMetrics = (channel, rate) => {
        const orderAmount = channel.goalAmount * rate;
        const confirmedSales = orderAmount * (channel.confirmedRate / 100);
        const salesQty = productPrice > 0 ? Math.floor(orderAmount / productPrice) : 0;

        const commission = confirmedSales * (channel.commission / 100);
        const modelFeePctCost = confirmedSales * (Number(extraCosts.modelFeeRate || 0) / 100);

        const variableCost = salesQty * (productCost + (channel.deliveryCost || 0) + Number(extraCosts.modelFeePerUnit || 0));
        const totalFixedCost = (channel.fixedFee || 0) + (channel.celebCost || 0) + Number(extraCosts.modelFeeFixed || 0);

        const operatingProfit = confirmedSales - commission - modelFeePctCost - variableCost - totalFixedCost;
        const profitMargin = confirmedSales > 0 ? (operatingProfit / confirmedSales) * 100 : 0;

        return {
            orderAmount,
            confirmedSales,
            salesQty,
            commission,
            variableCost,
            totalFixedCost,
            operatingProfit,
            profitMargin
        };
    };

    const calculateBEP = (c) => {
        const term1 = (c.confirmedRate / 100) * (1 - c.commission / 100 - (Number(extraCosts.modelFeeRate || 0) / 100));
        const term2 = (productCost + (c.deliveryCost || 0) + Number(extraCosts.modelFeePerUnit || 0)) / (productPrice || 1);
        const denominator = term1 - term2;
        if (denominator <= 0) return 0;
        return ((c.fixedFee || 0) + (c.celebCost || 0) + Number(extraCosts.modelFeeFixed || 0)) / denominator;
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-widest uppercase">Channel Intelligence</h2>
                    <p className="text-slate-400 text-sm mt-2 font-bold uppercase tracking-widest opacity-60">방송 조건 및 달성률에 따른 정교한 수익성 분석기</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <select
                            className="input-field h-12 min-w-[200px] bg-indigo-900/20 border-indigo-500/30 text-indigo-200"
                            onChange={(e) => {
                                loadProject(e.target.value);
                                e.target.value = '';
                            }}
                        >
                            <option value="">💾 저장된 시나리오 로드...</option>
                            {savedProjects.map(p => <option key={p.id} value={p.id}>{p.name} ({new Date(p.updatedAt).toLocaleDateString()})</option>)}
                        </select>
                        <button className="btn-secondary h-12 px-5 flex items-center justify-center gap-2 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500 hover:text-white" onClick={saveProject} title="현재 설정 저장">
                            <Save size={18} /> <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Save</span>
                        </button>
                    </div>

                    <div className="w-px h-8 bg-white/10 mx-2 hidden md:block"></div>

                    <div className="flex items-center gap-2 flex-1 xl:flex-none">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-500 transition-colors" size={14} />
                            <input
                                type="text"
                                className="input-field h-12 pl-10 pr-4 w-full md:w-[200px] bg-white/5 border-white/10"
                                placeholder="상품 검색..."
                                value={productSearchTerm}
                                onChange={e => setProductSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="input-field h-12 min-w-[280px] bg-white/5 border-white/10"
                            value={selectedProductId}
                            onChange={(e) => handleProductChange(e.target.value)}
                        >
                            <option value="">분석할 상품 선택...</option>
                            {filteredProductsForSelect.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.broadcastPrice || p.unitPrice)})</option>)}
                        </select>
                    </div>
                    <button className="btn-primary h-12 px-6 flex items-center justify-center gap-2" onClick={addChannel}>
                        <Plus size={18} />
                        <span className="font-black uppercase tracking-widest text-xs hidden sm:inline">CHANNEL UP</span>
                    </button>
                </div>
            </div>

            {/* Saved Projects Quick List with Delete */}
            {savedProjects.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in duration-500">
                    <span className="text-[10px] font-black text-slate-500 uppercase flex items-center mr-2">저장된 시나리오:</span>
                    {savedProjects.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full group hover:border-indigo-500/30 transition-all">
                            <button onClick={() => loadProject(p.id)} className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-300 uppercase tracking-widest">
                                {p.name}
                            </button>
                            <button
                                onClick={(e) => deleteProject(p.id, e)}
                                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                title="삭제"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Saved Projects Quick List (Optional, can be hidden if dropdown is enough, using dropdown for now) */}

            {selectedProduct && (
                <div className="glass-panel p-6 mb-8 border-l-4 border-l-orange-500 relative">
                    <h3 className="text-base font-black text-white mb-6 flex items-center gap-2">
                        <Calculator size={18} className="text-orange-500" />
                        시뮬레이션 조건 설정 (수량/비용 커스텀 및 다중 모델비 지원)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-4">
                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-2">기본 원가 (단품)</label>
                            <div className="text-lg font-mono font-black text-white">{formatCurrency(selectedProduct.unitPrice)}</div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-primary-400 font-bold uppercase mb-2">구성 수량 (배수)</label>
                            <input type="number" className="bg-slate-900 border border-primary-500/50 rounded px-2 py-2 w-full text-right font-mono font-bold text-primary-400" value={extraCosts.qty || ''} onChange={e => updateExtraCost('qty', Number(e.target.value))} placeholder="1" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2">판매가 (제안)</label>
                            <input type="number" className="bg-slate-900 border border-emerald-500/50 rounded px-2 py-2 w-full text-right font-mono font-bold text-emerald-400" value={extraCosts.sellingPrice || ''} onChange={e => updateExtraCost('sellingPrice', Number(e.target.value))} placeholder="0" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-2">포장비 (총 고정)</label>
                            <input type="number" className="bg-slate-900 border border-white/10 rounded px-2 py-2 w-full text-right font-mono" value={extraCosts.packagingCost || ''} onChange={e => updateExtraCost('packagingCost', Number(e.target.value))} placeholder="0" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-2">배송비 (총 고정)</label>
                            <input type="number" className="bg-slate-900 border border-white/10 rounded px-2 py-2 w-full text-right font-mono" value={extraCosts.deliveryCost || ''} onChange={e => updateExtraCost('deliveryCost', Number(e.target.value))} placeholder="0" />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-2">로스율 (%)</label>
                            <input type="number" className="bg-slate-900 border border-white/10 rounded px-2 py-2 w-full text-right font-mono" value={extraCosts.lossRate || ''} onChange={e => updateExtraCost('lossRate', Number(e.target.value))} placeholder="0" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-2">기타 추가 비용</label>
                            <input type="number" className="bg-slate-900 border border-white/10 rounded px-2 py-2 w-full text-right font-mono" value={extraCosts.otherCost || ''} onChange={e => updateExtraCost('otherCost', Number(e.target.value))} placeholder="0" />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] text-orange-400 font-bold uppercase mb-2">모델비 (정액 전체)</label>
                            <input type="number" className="bg-slate-900 border border-orange-500/30 rounded px-2 py-2 w-full text-right font-mono text-orange-300" value={extraCosts.modelFeeFixed || ''} onChange={e => updateExtraCost('modelFeeFixed', Number(e.target.value))} placeholder="0" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-orange-400 font-bold uppercase mb-2">모델비 (판매건당, 원)</label>
                            <input type="number" className="bg-slate-900 border border-orange-500/30 rounded px-2 py-2 w-full text-right font-mono text-orange-300" value={extraCosts.modelFeePerUnit || ''} onChange={e => updateExtraCost('modelFeePerUnit', Number(e.target.value))} placeholder="0" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-orange-400 font-bold uppercase mb-2">모델비 (매출요율, %)</label>
                            <input type="number" className="bg-slate-900 border border-orange-500/30 rounded px-2 py-2 w-full text-right font-mono text-orange-300" value={extraCosts.modelFeeRate || ''} onChange={e => updateExtraCost('modelFeeRate', Number(e.target.value))} placeholder="0" />
                        </div>
                    </div>
                </div>
            )}

            {/* Overall Comparison Table */}
            <div className="glass-panel overflow-hidden border-none shadow-2xl relative">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">홈쇼핑사</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">방송 조건 (정액 + 수수료)</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">택배비</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">목표 주문액</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">비고</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {channels.map(c => (
                                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <input
                                            className="bg-transparent border-none outline-none font-bold text-white w-full"
                                            value={c.name}
                                            onChange={(e) => updateChannel(c.id, 'name', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="bg-white/5 border border-white/10 rounded px-2 py-1 w-24 text-right text-sm"
                                                value={c.fixedFee}
                                                onChange={(e) => updateChannel(c.id, 'fixedFee', Number(e.target.value))}
                                            />
                                            <span className="text-slate-500">+</span>
                                            <input
                                                type="number"
                                                className="bg-white/5 border border-white/10 rounded px-2 py-1 w-16 text-right text-sm"
                                                value={c.commission}
                                                onChange={(e) => updateChannel(c.id, 'commission', Number(e.target.value))}
                                            />
                                            <span className="text-slate-500 text-xs">%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <input
                                            type="number"
                                            className="bg-white/5 border border-white/10 rounded px-2 py-1 w-24 text-right text-sm"
                                            value={c.deliveryCost}
                                            onChange={(e) => updateChannel(c.id, 'deliveryCost', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <input
                                            type="number"
                                            className="bg-white/5 border border-white/10 rounded px-2 py-1 w-32 text-right text-sm font-bold text-primary-400"
                                            value={c.goalAmount}
                                            onChange={(e) => updateChannel(c.id, 'goalAmount', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            className="bg-transparent border-none outline-none text-slate-400 text-xs w-full"
                                            value={c.remarks}
                                            placeholder="특이사항 입력..."
                                            onChange={(e) => updateChannel(c.id, 'remarks', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => removeChannel(c.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Achievement Matrix */}
            <div className="glass-panel p-6 space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                        <LayoutDashboard size={18} />
                    </span>
                    달성률별 영업이익 요약 (단위: 원)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase">달성률</th>
                                {channels.map(c => (
                                    <th key={c.id} className="p-4 text-[10px] font-black text-slate-400 text-center border-l border-white/5">
                                        {c.name} (목표 {Math.floor(c.goalAmount / 10000)}만)
                                    </th>
                                ))}
                                <th className="p-4 text-[10px] font-black text-primary-400 text-center border-l border-white/5 bg-primary-600/5">합계</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {achievementRates.map(rate => {
                                let totalProfit = 0;
                                return (
                                    <tr key={rate} className={cn("hover:bg-white/[0.02]", rate === 0.8 && "bg-primary-500/5")}>
                                        <td className="p-4 font-black text-slate-400 text-sm">{(rate * 100).toFixed(0)}%</td>
                                        {channels.map(c => {
                                            const metrics = calculateMetrics(c, rate);
                                            totalProfit += metrics.operatingProfit;
                                            return (
                                                <td key={c.id} className={cn("p-4 text-right font-mono text-sm border-l border-white/5", metrics.operatingProfit > 0 ? "text-green-400" : "text-red-400")}>
                                                    {formatCurrency(metrics.operatingProfit)}
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 text-right font-black font-mono text-sm border-l border-white/5 bg-primary-600/5 text-primary-400">
                                            {formatCurrency(totalProfit)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed Channel Breakdowns */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {channels.map(c => (
                    <div key={c.id} className="glass-panel overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-6 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h4 className="text-2xl font-black text-white">{c.name}</h4>
                                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                                    정액 {formatCurrency(c.fixedFee)} / 수수료 {c.commission}% / 택배 {formatCurrency(c.deliveryCost)} / 목표 {formatCurrency(c.goalAmount)}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">BEP 주문액</span>
                                <div className="text-xl font-bold text-orange-400 font-mono italic">
                                    약 {formatCurrency(calculateBEP(c))}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="bg-black/20 text-slate-500 uppercase font-black border-b border-white/5">
                                        <th className="p-3">구분</th>
                                        {achievementRates.map(r => <th key={r} className="p-3 text-right">{(r * 100).toFixed(0)}% 달성</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-3 font-bold text-slate-400">주문 금액(방송)</td>
                                        {achievementRates.map(r => <td key={r} className="p-3 text-right font-mono text-white">{formatCurrency(calculateMetrics(c, r).orderAmount)}</td>)}
                                    </tr>
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-3 font-bold text-slate-400">확정 매출({c.confirmedRate}%)</td>
                                        {achievementRates.map(r => <td key={r} className="p-3 text-right font-mono text-white">{formatCurrency(calculateMetrics(c, r).confirmedSales)}</td>)}
                                    </tr>
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-3 font-bold text-slate-400">판매 수량(박스)</td>
                                        {achievementRates.map(r => <td key={r} className="p-3 text-right font-mono text-white">{calculateMetrics(c, r).salesQty.toLocaleString()}</td>)}
                                    </tr>
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-3 font-bold text-slate-400">방송 수수료({c.commission}%)</td>
                                        {achievementRates.map(r => <td key={r} className="p-3 text-right font-mono text-red-400/70">{formatCurrency(calculateMetrics(c, r).commission)}</td>)}
                                    </tr>
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-3 font-bold text-slate-400">변동 원가(물류비 포함)</td>
                                        {achievementRates.map(r => <td key={r} className="p-3 text-right font-mono text-red-400/70">{formatCurrency(calculateMetrics(c, r).variableCost)}</td>)}
                                    </tr>
                                    <tr className="hover:bg-white/[0.01] bg-white/[0.01]">
                                        <td className="p-3 font-bold text-slate-400">총 고정비(정액+셀럽)</td>
                                        {achievementRates.map(r => <td key={r} className="p-3 text-right font-mono text-red-500/80">{formatCurrency(calculateMetrics(c, r).totalFixedCost)}</td>)}
                                    </tr>
                                    <tr className="hover:bg-primary-500/10 bg-primary-500/5">
                                        <td className="p-3 font-black text-primary-400">영업 이익</td>
                                        {achievementRates.map(r => (
                                            <td key={r} className={cn("p-3 text-right font-black font-mono text-xs", calculateMetrics(c, r).operatingProfit > 0 ? "text-green-400 shadow-highlight" : "text-red-400")}>
                                                {formatCurrency(calculateMetrics(c, r).operatingProfit)}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="hover:bg-white/[0.05]">
                                        <td className="p-3 font-bold text-slate-400">이익률(확정매출 대비)</td>
                                        {achievementRates.map(r => (
                                            <td key={r} className={cn("p-3 text-right font-mono font-bold", calculateMetrics(c, r).profitMargin > 0 ? "text-slate-200" : "text-red-500/70")}>
                                                {calculateMetrics(c, r).profitMargin.toFixed(1)}%
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pb-10 flex justify-center opacity-50">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">ABAR Real-time Profit Intelligence Platform</p>
            </div>
        </div>
    );
}

function HistoryTable({ data, onDelete, onEdit, onDownload, onUpload }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white">원가 히스토리</h2>
                    <p className="text-slate-400 text-sm mt-1">원가 변동 기록 관리 및 데이터 백업</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button className="btn-secondary h-12" onClick={onDownload}>
                        <Download size={18} /> 백업 다운로드
                    </button>
                    <label className="btn-secondary h-12 cursor-pointer">
                        <Upload size={18} /> 데이터 업로드
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={onUpload} />
                    </label>
                </div>
            </div>

            <div className="glass-panel overflow-hidden border-none shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="p-4">날짜</th>
                                <th className="p-4">상품명</th>
                                <th className="p-4 text-right">이전 원가</th>
                                <th className="p-4 text-right">변경 원가</th>
                                <th className="p-4 text-center">동작</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.length > 0 ? data.map(log => {
                                const diff = (log.newPrice || 0) - (log.oldPrice || 0);
                                return (
                                    <tr key={log.id} className="hover:bg-white/[0.01] group">
                                        <td className="p-4 text-xs font-mono text-slate-500">{new Date(log.date).toLocaleString()}</td>
                                        <td className="p-4 font-bold text-white">{log.productName}</td>
                                        <td className="p-4 text-right font-mono text-slate-400">{formatCurrency(log.oldPrice)}</td>
                                        <td className="p-4 text-right font-mono font-bold text-white">{formatCurrency(log.newPrice)}</td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <div className={cn("text-[10px] font-black px-2 py-0.5 rounded", diff > 0 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500")}>
                                                {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        const newName = prompt('수정할 상품명을 입력하세요', log.productName);
                                                        if (newName) onEdit(log.id, { productName: newName });
                                                    }}
                                                    className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-all"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => confirm('삭제하시겠습니까?') && onDelete(log.id)}
                                                    className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="5" className="p-20 text-center text-slate-500 italic">변경 이력이 없습니다.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SettingsView({
    currentPassword,
    onPasswordChange,
    onLogout,
    shippingRules,
    setShippingRules,
    categories,
    setCategories
}) {
    const [newPassword, setNewPassword] = useState('');

    const addRule = (type) => {
        const label = prompt(type === 'carrier' ? '배송업체명을 입력하세요' : '무게/수량 조건을 입력하세요');
        const cost = prompt('기본 배송비를 입력하세요', '3000');
        if (label && cost) {
            setShippingRules([...shippingRules, { id: Date.now().toString(), type, label, cost: parseInt(cost) }]);
        }
    };

    const removeRule = (id) => {
        if (confirm('이 설정을 삭제하시겠습니까?')) {
            setShippingRules(shippingRules.filter(r => r.id !== id));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                    <Truck className="text-primary-500" size={24} />
                    배송비 프리셋 관리
                </h3>
                <div className="glass-panel p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">배송업체별 설정</h4>
                            <button onClick={() => addRule('carrier')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                <Plus size={14} /> 규칙 추가
                            </button>
                        </div>
                        <div className="space-y-2">
                            {shippingRules.filter(r => r.type === 'carrier').map(r => (
                                <div key={r.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                                    <span className="text-sm text-slate-300">{r.label}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-white">{formatCurrency(r.cost)}</span>
                                        <button onClick={() => removeRule(r.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">무게별 설정</h4>
                            <button onClick={() => addRule('weight')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                <Plus size={14} /> 규칙 추가
                            </button>
                        </div>
                        <div className="space-y-2">
                            {shippingRules.filter(r => r.type === 'weight').map(r => (
                                <div key={r.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                                    <span className="text-sm text-slate-300">{r.label}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-white">{formatCurrency(r.cost)}</span>
                                        <button onClick={() => removeRule(r.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">수량별 설정</h4>
                            <button onClick={() => addRule('quantity')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                <Plus size={14} /> 규칙 추가
                            </button>
                        </div>
                        <div className="space-y-2">
                            {shippingRules.filter(r => r.type === 'quantity').map(r => (
                                <div key={r.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                                    <span className="text-sm text-slate-300">{r.label}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-white">{formatCurrency(r.cost)}</span>
                                        <button onClick={() => removeRule(r.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                    <Grid className="text-primary-500" size={24} />
                    카테고리 관리
                </h3>
                <div className="glass-panel p-6 space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="new-category-input"
                            className="input-field flex-1"
                            placeholder="새로운 카테고리 이름 입력..."
                        />
                        <button
                            className="btn-primary"
                            onClick={() => {
                                const input = document.getElementById('new-category-input');
                                const val = input.value.trim();
                                if (val) {
                                    if (categories.includes(val)) return alert('이미 존재하는 카테고리입니다.');
                                    setCategories([...categories, val]);
                                    input.value = '';
                                }
                            }}
                        >추가</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(c => (
                            <div key={c} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 group hover:border-primary-500/50 transition-all">
                                <span className="text-sm font-bold">{c}</span>
                                <button
                                    onClick={() => {
                                        if (confirm(`'${c}' 카테고리를 삭제하시겠습니까 ? `)) {
                                            setCategories(categories.filter(item => item !== c));
                                        }
                                    }}
                                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                    <Settings className="text-primary-500" size={24} />
                    보안 및 시스템 설정
                </h3>
                <div className="glass-panel p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">현재 비밀번호</label>
                        <div className="text-lg font-mono text-slate-400 p-3 bg-white/5 rounded-lg border border-white/5">
                            {currentPassword.replace(/./g, '*')}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">새 비밀번호 변경</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                className="input-field flex-1"
                                placeholder="새로운 비밀번호 입력"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    if (newPassword.length < 4) return alert('4자리 이상 입력해주세요.');
                                    onPasswordChange(newPassword);
                                    setNewPassword('');
                                }}
                            >변경</button>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 space-y-4">
                        <button
                            onClick={() => {
                                if (confirm('모든 데이터를 초기 설정으로 되돌리시겠습니까? 현재 저장된 모든 정보가 삭제됩니다.')) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            className="btn-secondary w-full text-orange-400 hover:text-white hover:bg-orange-600/20"
                        >
                            시스템 데이터 초기화 (Reset)
                        </button>
                        <button onClick={onLogout} className="btn-secondary w-full text-red-400 hover:text-white hover:bg-red-600/20">
                            로그아웃 (세션 종료)
                        </button>
                    </div>
                </div>

                <div className="space-y-4 pt-10 mt-10 border-t border-white/10">
                    <h3 className="text-xl font-bold flex items-center gap-3 text-orange-400">
                        <Download size={24} />
                        배포용 데이터 추출
                    </h3>
                    <div className="glass-panel p-6 space-y-4 bg-orange-500/5 border-orange-500/20">
                        <p className="text-sm text-slate-400">
                            현재 등록된 모든 상품, 히스토리, 채널 설정을 소스 코드에 포함하여 배포하기 위한 데이터를 추출합니다.
                            아래 버튼을 누른 후 생성되는 파일을 열어서 그 내용을 복사해 전달해 주세요.
                        </p>
                        <button
                            className="btn-primary w-full bg-orange-600 hover:bg-orange-500 border-none h-14 text-lg"
                            onClick={() => {
                                const data = {
                                    products: JSON.parse(localStorage.getItem('abar_products') || '[]'),
                                    history: JSON.parse(localStorage.getItem('abar_history') || '[]'),
                                    shipping_rules: JSON.parse(localStorage.getItem('abar_shipping_rules') || '[]'),
                                    hs_channels: JSON.parse(localStorage.getItem('abar_hs_channels') || '[]'),
                                    categories: JSON.parse(localStorage.getItem('abar_categories') || '[]'),
                                    hs_projects: JSON.parse(localStorage.getItem('hsProjects') || '[]'),
                                    proposals: JSON.parse(localStorage.getItem('abar_proposals') || '[]')
                                };
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `abar_deployment_data.json`;
                                a.click();
                                alert('데이터 파일이 다운로드되었습니다. 파일 내용을 채팅창에 붙여넣어 주세요!');
                            }}
                        >
                            전체 데이터 추출 (JSON 다운로드)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
