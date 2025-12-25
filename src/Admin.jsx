// src/Admin.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Trash2, Clock, Check, Loader2, LayoutDashboard, 
  ShoppingBag, LogOut, Bell, BellOff, MessageCircle, 
  MapPin, Phone, User, DollarSign, TrendingUp, Calendar, 
  Menu, X, Search, ChevronRight 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Legend, AreaChart, Area 
} from 'recharts';

// REMOVIDO: import { createClient } from ... (Causava o erro)

/* --- CONFIGURAÇÕES --- */
const ADMIN_PASSWORD = '071224';
const TABLE = 'doceeser_pedidos';
const MOTOBOY_NUMBER = '5548991692018'; 

// Chaves do Supabase (Mantidas)
const SUPABASE_URL = 'https://elpinlotdogazhpdwlqr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGlubG90ZG9nYXpocGR3bHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMjU3MjEsImV4cCI6MjA4MDkwMTcyMX0.alb18e60SkJGV1EBcjJb8CSmj7rshm76qcxRog_B2uY';

const STATUS_CONFIG = {
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Bell },
  preparando: { label: 'Preparando', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  pronto: { label: 'Pronto', color: 'bg-green-100 text-green-800 border-green-200', icon: Check },
  entregue: { label: 'Entregue', color: 'bg-gray-100 text-gray-600 border-gray-200', icon:  User }
};

/* --- UTILITÁRIOS --- */
const formatCurrency = (val) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export default function Admin() {
  // Estado para o cliente Supabase
  const [supabase, setSupabase] = useState(null);
  
  const [isAuth, setIsAuth] = useState(() => !!localStorage.getItem('doceeser_admin'));
  const [passwordInput, setPasswordInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showNewOrderBanner, setShowNewOrderBanner] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [view, setView] = useState('orders'); // 'orders' | 'dashboard'
  const [autoSendWhatsapp, setAutoSendWhatsapp] = useState(false);
  const [stats, setStats] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. EFEITO: Carregar Script do Supabase (CDN)
  useEffect(() => {
    // Se já existe no window, inicializa
    if (window.supabase && window.supabase.createClient) {
      setSupabase(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
      return;
    }

    // Se não, injeta o script
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

  // Solicitar permissão de notificação
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Tocar som
  const playSound = () => {
    try {
      const audio = new Audio('/ding.mp3'); 
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {
      console.warn('Erro audio', e);
    }
  };

  // WhatsApp
  const formatWhatsappMessage = (order) => {
    const customer = order.customer || {};
    const fullAddress = `${customer.rua || ''}, ${customer.numero || ''} - ${customer.bairro || ''}`.trim();
    const mapsLink = encodeURIComponent(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`);
    
    const itemsList = Array.isArray(order.items)
      ? order.items.map(it => `• ${it.quantity || 1}x ${it.name}${it.toppings?.length ? ` (+${it.toppings.join(', ')})` : ''}`).join('%0A')
      : '';

    return `🚚 *NOVO PEDIDO #${order.id.slice(0, 8)}*%0A%0A` +
           `👤 *Cliente:* ${customer.nome || '-'}%0A` +
           `📞 *Tel:* ${customer.telefone || '-'}%0A` +
           `📍 *Endereço:* ${fullAddress}%0A` +
           `🗺 *Mapa:* ${mapsLink}%0A%0A` +
           `🛒 *Itens:*%0A${itemsList}%0A%0A` +
           `💰 *Total:* ${formatCurrency(order.total)}`;
  };

  const sendWhatsapp = (order) => {
    const text = formatWhatsappMessage(order);
    window.open(`https://wa.me/${MOTOBOY_NUMBER}?text=${text}`, '_blank');
  };

  // Estatísticas
  const computeStats = (ordersArr) => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const list = ordersArr || [];
      const todayOrders = list.filter(o => o.createdAt && o.createdAt >= startOfToday);
      
      const totalToday = todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const countToday = todayOrders.length;
      const ticketAvg = countToday ? totalToday / countToday : 0;

      // Por Status
      const statusMap = {};
      list.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
      const statusSeries = Object.keys(statusMap).map(k => ({ status: k, count: statusMap[k], name: STATUS_CONFIG[k]?.label || k }));

      // Vendas 7 dias
      const days = [];
      for (let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i);
        const key = d.toISOString().slice(0,10);
        const displayDate = `${d.getDate()}/${d.getMonth()+1}`;
        days.push({ key, total: 0, name: displayDate });
      }
      
      list.forEach(o => {
        if (!o.createdAt) return;
        const key = o.createdAt.slice(0,10);
        const day = days.find(d => d.key === key);
        if (day) day.total += (Number(o.total) || 0);
      });

      setStats({ totalToday, countToday, ticketAvg, statusSeries, salesSeries: days });
    } catch (e) { console.error(e); }
  };

  // Fetch e Realtime
  const fetchOrders = async () => {
    if (!supabase) return; // Guard clause
    setLoading(true);
    const { data, error } = await supabase.from(TABLE).select('*').order('createdAt', { ascending: false });
    if (!error) {
      setOrders(data || []);
      computeStats(data || []);
    }
    setLoading(false);
  };

  // 2. EFEITO: Monitorar pedidos (Só roda quando 'supabase' estiver pronto e auth ok)
  useEffect(() => {
    if (!isAuth || !supabase) return;

    fetchOrders();

    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, payload => {
        const newOrder = payload.new;
        if (newOrder) {
          if (soundEnabled) playSound();
          setShowNewOrderBanner(true);
          setTimeout(() => setShowNewOrderBanner(false), 8000);
          if (Notification.permission === 'granted') {
            new Notification('Novo Pedido!', { body: `Valor: ${formatCurrency(newOrder.total)}` });
          }
          if (autoSendWhatsapp) sendWhatsapp(newOrder);
          fetchOrders();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE }, () => fetchOrders())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isAuth, supabase, soundEnabled, autoSendWhatsapp]);

  // Ações
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      localStorage.setItem('doceeser_admin', '1');
      setIsAuth(true);
    } else alert('Senha incorreta');
  };

  const updateStatus = async (id, status) => {
    if (!supabase) return;
    await supabase.from(TABLE).update({ status }).eq('id', id);
    // Optimistic update
    const updated = orders.map(o => o.id === id ? { ...o, status } : o);
    setOrders(updated);
    computeStats(updated);
  };

  // Filtragem
  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  // --- TELA DE CARREGAMENTO INICIAL (Se supabase ainda não carregou) ---
  if (isAuth && !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
          <p className="text-gray-500">Conectando ao sistema...</p>
        </div>
      </div>
    );
  }

  // --- TELA DE LOGIN ---
  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-amber-100">
          <div className="text-center mb-8">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Área Administrativa</h1>
            <p className="text-gray-500">Doce É Ser</p>
          </div>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              autoFocus
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none mb-4 transition"
              placeholder="Digite a senha de acesso"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
            />
            <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition shadow-md hover:shadow-lg">
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- LAYOUT PRINCIPAL ---
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 shadow-sm z-10">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold">D</div>
          <span className="font-bold text-xl text-gray-800">Doce É Ser</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <SidebarItem icon={ShoppingBag} label="Pedidos" active={view === 'orders'} onClick={() => setView('orders')} badge={orders.filter(o => o.status === 'novo').length} />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-amber-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-amber-800 font-semibold mb-2">Configurações Rápidas</p>
            <div className="space-y-2">
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-amber-700 w-full">
                {soundEnabled ? <Bell className="w-4 h-4 text-green-600" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                {soundEnabled ? 'Som Ativo' : 'Som Mudo'}
              </button>
              <button onClick={() => setAutoSendWhatsapp(!autoSendWhatsapp)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-amber-700 w-full">
                <MessageCircle className={`w-4 h-4 ${autoSendWhatsapp ? 'text-green-600' : 'text-gray-400'}`} />
                Auto WhatsApp
              </button>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('doceeser_admin'); setIsAuth(false); }} className="flex items-center gap-2 text-red-600 hover:bg-red-50 p-2 rounded w-full transition">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-white z-20 shadow-sm px-4 py-3 flex justify-between items-center">
        <div className="font-bold text-lg text-amber-700">Admin Doce</div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-10 pt-16 px-6 md:hidden flex flex-col gap-4">
          <button onClick={() => { setView('orders'); setMobileMenuOpen(false); }} className="p-3 bg-amber-50 rounded-lg text-amber-800 font-bold text-left">Pedidos</button>
          <button onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }} className="p-3 bg-gray-50 rounded-lg text-gray-700 font-bold text-left">Dashboard</button>
          <div className="h-px bg-gray-200 my-2"></div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="flex items-center gap-2 text-gray-600">{soundEnabled ? <Bell className="w-5 h-5 text-green-500"/> : <BellOff className="w-5 h-5"/>} Som de Alerta</button>
          <button onClick={() => setAutoSendWhatsapp(!autoSendWhatsapp)} className="flex items-center gap-2 text-gray-600"><MessageCircle className={`w-5 h-5 ${autoSendWhatsapp ? 'text-green-500' : 'text-gray-400'}`}/> Auto WhatsApp</button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 relative pt-16 md:pt-0">
        
        {/* Banner de Novo Pedido */}
        {showNewOrderBanner && (
          <div className="sticky top-0 z-50 bg-blue-600 text-white px-6 py-3 shadow-lg flex justify-between items-center animate-pulse cursor-pointer" onClick={() => setView('orders')}>
            <div className="flex items-center gap-2 font-bold"><Bell className="w-5 h-5" /> Novo pedido recebido!</div>
            <button onClick={(e) => {e.stopPropagation(); setShowNewOrderBanner(false)}}><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-4 md:p-8">
          
          {/* VIEW: DASHBOARD */}
          {view === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-800">Visão Geral da Loja</h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Vendas Hoje" value={formatCurrency(stats.totalToday)} icon={DollarSign} color="text-green-600" bg="bg-green-50" />
                <StatCard title="Pedidos Hoje" value={stats.countToday || 0} icon={ShoppingBag} color="text-blue-600" bg="bg-blue-50" />
                <StatCard title="Ticket Médio" value={formatCurrency(stats.ticketAvg)} icon={TrendingUp} color="text-purple-600" bg="bg-purple-50" />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold mb-4 text-gray-700">Vendas (Últimos 7 dias)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.salesSeries}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d97706" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Area type="monotone" dataKey="total" stroke="#d97706" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold mb-4 text-gray-700">Pedidos por Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.statusSeries}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px'}} />
                        <Bar dataKey="count" fill="#4b5563" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ORDERS */}
          {view === 'orders' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Gerenciamento de Pedidos</h2>
                  <p className="text-gray-500 text-sm">Acompanhe e atualize os pedidos em tempo real.</p>
                </div>
                
                {/* Status Filters */}
                <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-200 overflow-x-auto max-w-full">
                  {['all', 'novo', 'preparando', 'pronto', 'entregue'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilter(st)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
                        filter === st 
                        ? 'bg-amber-100 text-amber-800 shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {st === 'all' ? 'Todos' : STATUS_CONFIG[st]?.label || st}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-amber-600" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredOrders.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-300">
                      <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <ShoppingBag />
                      </div>
                      <p className="text-gray-500">Nenhum pedido encontrado com este filtro.</p>
                    </div>
                  ) : (
                    filteredOrders.map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={updateStatus} 
                        onWhatsApp={sendWhatsapp} 
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

/* --- SUBCOMPONENTES --- */

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group ${
      active ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
      <span>{label}</span>
    </div>
    {badge > 0 && (
      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
    )}
  </button>
);

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bg} ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const OrderCard = ({ order, onUpdateStatus, onWhatsApp }) => {
  const statusInfo = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
  const StatusIcon = statusInfo.icon || User;
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all hover:shadow-md ${order.status === 'novo' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
      
      {/* Header do Card */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">#{order.id.slice(0,6)}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${statusInfo.color}`}>
            <StatusIcon className="w-3 h-3" /> {statusInfo.label}
          </span>
        </div>
        <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {formatDate(order.createdAt)}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1">
        {/* Cliente */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-800 text-sm truncate">{order.customer?.nome || 'Cliente não id.'}</span>
          </div>
          <div className="pl-6 text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-1"><Phone className="w-3 h-3"/> {order.customer?.telefone || '-'}</div>
            <div className="flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0"/> 
              <span className="line-clamp-2">
                {order.customer?.rua ? `${order.customer.rua}, ${order.customer.numero}` : 'Retirada/Sem endereço'}
                {order.customer?.bairro && ` - ${order.customer.bairro}`}
              </span>
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100 mb-4">
          <ul className="space-y-2">
            {Array.isArray(order.items) ? order.items.map((item, idx) => (
              <li key={idx} className="flex justify-between items-start text-gray-700">
                <span className="font-medium mr-2">{item.quantity}x</span>
                <div className="flex-1">
                  <span className="block leading-tight">{item.name}</span>
                  {item.toppings && item.toppings.length > 0 && (
                    <span className="text-xs text-gray-500 block leading-tight">+ {item.toppings.join(', ')}</span>
                  )}
                </div>
              </li>
            )) : <li className="text-gray-400 italic">Sem itens</li>}
          </ul>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 border-dashed">
          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Ações */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 justify-between">
        <div className="flex gap-1">
          {order.status === 'novo' && (
            <button onClick={() => onUpdateStatus(order.id, 'preparando')} title="Aceitar e Preparar" className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition">
              <span className="text-xs font-bold">Aceitar</span>
            </button>
          )}
          {order.status === 'preparando' && (
            <button onClick={() => onUpdateStatus(order.id, 'pronto')} title="Marcar Pronto" className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition">
              <Check className="w-4 h-4" />
            </button>
          )}
          {order.status === 'pronto' && (
            <button onClick={() => onUpdateStatus(order.id, 'entregue')} title="Marcar Entregue" className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button 
          onClick={() => onWhatsApp(order)} 
          className="flex-1 flex items-center justify-center gap-2 bg-white border border-green-500 text-green-600 hover:bg-green-50 py-1.5 px-3 rounded-lg text-xs font-bold transition"
        >
          <MessageCircle className="w-4 h-4" /> Motoboy
        </button>
      </div>
    </div>
  );
};
