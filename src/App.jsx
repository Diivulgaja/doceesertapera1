// src/App.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  ShoppingCart, Plus, Minus, X, Home, ChevronRight, Truck, MapPin,
  Loader2, Cake, Heart, Trash2, Check, Clock
} from "lucide-react";

/* ------------- CONFIGURAÇÕES ------------- */
const COLLECTION_ORDERS = "doceeser_pedidos";
const DELIVERY_FEE = 2.99;
const ETA_TEXT = "20–35 min";

// Chaves do Supabase
const SUPABASE_URL = 'https://elpinlotdogazhpdwlqr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGlubG90ZG9nYXpocGR3bHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMjU3MjEsImV4cCI6MjA4MDkwMTcyMX0.alb18e60SkJGV1EBcjJb8CSmj7rshm76qcxRog_B2uY';

// --- DADOS AÇAÍ ---
const ACAI_TOPPINGS = [
  { name: "Banana", price: 0.01 },
  { name: "Morango", price: 2.00 },
  { name: "Leite Ninho", price: 1.00 },
  { name: "Leite Condensado", price: 0.01 },
  { name: "Creme de Ninho", price: 1.00 },
  { name: "Nutella", price: 3.00 },
  { name: "Amendoim", price: 1.00 },
];
const ACAI_ID = 18;
const ACAI_BASE_PRICE = 17.90;

// --- PRODUTOS ---
const initialProducts = [
  {
    id: 9,
    name: "Red velvet com Ninho e Morangos",
    price: 15.90,
    category: 'bolos',
    description: "Massa aveludada e macia, coberta com creme de leite Ninho cremoso e morangos fresquinhos.",
    imageUrl: "https://i.imgur.com/3UDWhLR.png"
  },
  {
    id: 2,
    name: "Bolo Cenoura com chocolate",
    price: 15.90,
    category: 'bolos',
    description: "Mini vulcão de cenoura: uma massa fofinha e úmida de bolo de cenoura com chocolate.",
    imageUrl: "https://i.imgur.com/aaUdL2b.png"
  },
  {
    id: 10,
    name: "Chocolate com Morangos",
    price: 15.90,
    category: 'bolos',
    description: "Bolo fofinho de chocolate, cobertura cremosa 50% e morangos fresquinhos.",
    imageUrl: "https://i.imgur.com/MMbQohl.png"
  },
  {
    id: 13,
    name: "Chocolatudo!!!",
    price: 15.90,
    category: 'bolos',
    description: "Bolo chocolatudo com creme de chocolate 50% e granulados.",
    imageUrl: "https://i.imgur.com/3Hva4Df.png"
  },
  {
    id: 16,
    name: "Bolo de Ferreiro com Nutella",
    price: 16.90,
    category: 'bolos',
    description: "Bolo de chocolate com amendoim, Nutella e chocolate 50%.",
    imageUrl: "https://i.imgur.com/OamNqov.png"
  },
  {
    id: 17,
    name: "Copo Oreo com Nutella",
    price: 24.90,
    category: 'copo_felicidade',
    description: "Camadas de creme de Ninho, Oreo e Nutella.",
    imageUrl: "https://i.imgur.com/1EZRMVl.png"
  },
  {
    id: 20,
    name: "Brownie De Ninho e Nutella",
    price: 11.90,
    category: 'brownie',
    description: "Brownie com creme de Ninho e Nutella.",
    imageUrl: "https://i.imgur.com/vWdYZ8K.png"
  },
  {
    id: ACAI_ID,
    name: "Copo de Açaí 250ml",
    price: ACAI_BASE_PRICE,
    category: 'acai',
    description: "Copo de Açaí cremoso — escolha seus acompanhamentos.",
    imageUrl: "https://i.imgur.com/OrErP8N.png"
  },
  {
    id: 6,
    name: "Empada de Camarão e Requeijão",
    price: 12.00,
    category: 'salgado',
    description: "Camarão cremoso com requeijão.",
    imageUrl: "https://i.imgur.com/rV18DkJ.png"
  }
];

const categories = {
  all: 'Todos',
  bolos: 'Bolos',
  copo_felicidade: 'Copos',
  brownie: 'Brownies',
  acai: 'Açaí',
  salgado: 'Salgados',
};

const formatBR = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

export default function App() {
  const [supabase, setSupabase] = useState(null);
  const [page, setPage] = useState('menu');
  const [cart, setCart] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [acaiModalProduct, setAcaiModalProduct] = useState(null);
  
  // Dados do pedido
  const [customer, setCustomer] = useState({ nome: '', telefone: '', rua: '', numero: '', bairro: '' });
  const [lastOrderId, setLastOrderId] = useState(null);

  // --- 1. CARREGAR SUPABASE VIA CDN (Fix para o erro de build) ---
  useEffect(() => {
    if (window.supabase && window.supabase.createClient) {
      setSupabase(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = () => {
      if (window.supabase) {
        setSupabase(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
      }
    };
    document.body.appendChild(script);
  }, []);

  // --- CARRINHO ---
  const addToCart = (product, quantity = 1, toppings = []) => {
    const uniqueId = product.isCustom ? product.uniqueId : product.id;
    setCart(prev => {
      const existing = prev.find(item => (item.isCustom ? item.uniqueId === uniqueId : item.id === product.id));
      if (existing) {
        return prev.map(item => (item === existing ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [...prev, { ...product, quantity, toppings, uniqueId }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => (item.uniqueId || item.id) !== itemId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const finalTotal = cartTotal + DELIVERY_FEE;

  // --- CHECKOUT ---
  const handleCheckout = async () => {
    if (!supabase) return alert("Sistema conectando... aguarde um momento.");
    if (!customer.nome || !customer.telefone || !customer.rua) {
      return alert("Por favor, preencha seus dados de entrega.");
    }

    const orderId = `ord_${Date.now()}`;
    const payload = {
      id: orderId,
      status: 'novo',
      createdAt: new Date().toISOString(),
      total: finalTotal,
      items: cart,
      customer: customer
    };

    const { error } = await supabase.from(COLLECTION_ORDERS).insert(payload);
    
    if (error) {
      console.error(error);
      alert("Erro ao enviar pedido. Tente novamente.");
    } else {
      setLastOrderId(orderId);
      setCart([]);
      setPage('tracking');
    }
  };

  // --- COMPONENTES INTERNOS ---
  
  const ProductCard = ({ product }) => (
    <div className="flex flex-col rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-white">
      <div className="h-40 overflow-hidden relative">
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-white/90 text-xs font-bold shadow-sm uppercase">{categories[product.category] || product.category}</div>
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800 leading-tight">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <span className="font-bold text-amber-700 text-lg">{formatBR(product.price)}</span>
          <button 
            onClick={() => product.id === ACAI_ID ? setAcaiModalProduct(product) : addToCart(product)}
            className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 active:scale-95 transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const AcaiModal = () => {
    if (!acaiModalProduct) return null;
    const [selected, setSelected] = useState([]);
    const toggle = (name) => setSelected(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
    const extraPrice = selected.reduce((acc, name) => acc + (ACAI_TOPPINGS.find(t => t.name === name)?.price || 0), 0);
    const finalPrice = acaiModalProduct.price + extraPrice;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          <div className="p-4 border-b flex justify-between items-center bg-amber-50">
            <h3 className="font-bold text-amber-900">Montar Açaí</h3>
            <button onClick={() => setAcaiModalProduct(null)} className="p-1 hover:bg-amber-100 rounded-full"><X className="w-5 h-5 text-amber-900"/></button>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-gray-500 mb-3">Escolha seus adicionais:</p>
            <div className="space-y-2">
              {ACAI_TOPPINGS.map(t => (
                <div key={t.name} onClick={() => toggle(t.name)} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition ${selected.includes(t.name) ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}>
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-gray-500 font-bold">+{formatBR(t.price)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{formatBR(finalPrice)}</p>
            </div>
            <button 
              onClick={() => {
                addToCart({ ...acaiModalProduct, price: finalPrice, isCustom: true, uniqueId: Math.random().toString(36) }, 1, selected);
                setAcaiModalProduct(null);
              }}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-700 transition"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- PÁGINAS ---
  
  const MenuPage = (
    <div className="pb-24">
      {/* Categorias */}
      <div className="flex gap-2 overflow-x-auto p-4 pb-2 sticky top-16 bg-gray-50 z-10 no-scrollbar">
        {Object.entries(categories).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${categoryFilter === key ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialProducts
          .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
          .map(p => <ProductCard key={p.id} product={p} />)
        }
      </div>
    </div>
  );

  const CartPage = (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ShoppingCart /> Seu Carrinho</h2>
      
      {cart.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Cake className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Seu carrinho está vazio.</p>
          <button onClick={() => setPage('menu')} className="mt-4 text-amber-600 font-bold hover:underline">Ver Cardápio</button>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {cart.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start animate-slideUp">
                <div>
                  <h4 className="font-bold text-gray-800">{item.name}</h4>
                  {item.toppings && item.toppings.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">+ {item.toppings.join(', ')}</p>
                  )}
                  <p className="text-amber-700 font-bold mt-2">{formatBR(item.price * item.quantity)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => item.quantity > 1 ? addToCart(item, -1) : removeFromCart(item.uniqueId || item.id)} className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-red-600"><Minus className="w-4 h-4"/></button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item, 1)} className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-green-600"><Plus className="w-4 h-4"/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Entrega</h3>
            <div className="grid gap-3">
              <input placeholder="Seu Nome" className="p-3 border rounded-lg bg-gray-50" value={customer.nome} onChange={e => setCustomer({...customer, nome: e.target.value})} />
              <input placeholder="Telefone (WhatsApp)" className="p-3 border rounded-lg bg-gray-50" value={customer.telefone} onChange={e => setCustomer({...customer, telefone: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="Rua" className="col-span-2 p-3 border rounded-lg bg-gray-50" value={customer.rua} onChange={e => setCustomer({...customer, rua: e.target.value})} />
                <input placeholder="Nº" className="p-3 border rounded-lg bg-gray-50" value={customer.numero} onChange={e => setCustomer({...customer, numero: e.target.value})} />
              </div>
              <input placeholder="Bairro" className="p-3 border rounded-lg bg-gray-50" value={customer.bairro} onChange={e => setCustomer({...customer, bairro: e.target.value})} />
            </div>
            
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatBR(cartTotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Taxa de Entrega</span><span>{formatBR(DELIVERY_FEE)}</span></div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2"><span>Total</span><span>{formatBR(finalTotal)}</span></div>
            </div>

            <button onClick={handleCheckout} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
              <Truck className="w-5 h-5" /> Enviar Pedido
            </button>
          </div>
        </>
      )}
    </div>
  );

  const TrackingPage = (
    <div className="p-8 max-w-md mx-auto text-center pt-20">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce">
        <Check className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido Recebido!</h2>
      <p className="text-gray-600 mb-6">A cozinha já está preparando suas delícias. Acompanhe o status:</p>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Status Atual</p>
        <p className="text-xl font-bold text-amber-600">Recebido / Em Análise</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" /> Previsão: {ETA_TEXT}
        </div>
      </div>

      <button onClick={() => setPage('menu')} className="text-amber-700 font-bold hover:underline">Voltar ao Menu</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-40 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('menu')}>
            <div className="bg-amber-100 p-2 rounded-lg"><Cake className="w-5 h-5 text-amber-600" /></div>
            <h1 className="font-bold text-lg tracking-tight text-amber-900">Doce É Ser</h1>
          </div>
          <button onClick={() => setPage('cart')} className="relative p-2 hover:bg-gray-100 rounded-full transition">
            <ShoppingCart className="w-6 h-6 text-gray-700" />
            {cart.length > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">{cart.reduce((a,b)=>a+b.quantity,0)}</span>}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto min-h-[80vh]">
        {page === 'menu' && MenuPage}
        {page === 'cart' && CartPage}
        {page === 'tracking' && TrackingPage}
      </main>

      {/* Modals */}
      <AcaiModal />

      {/* Footer */}
      <footer className="bg-white border-t py-8 text-center text-gray-400 text-sm mt-auto">
        <p className="flex items-center justify-center gap-1">Feito com <Heart className="w-3 h-3 text-red-400 fill-current" /> por Doce É Ser</p>
      </footer>
    </div>
  );
}
