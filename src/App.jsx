import React, { useState, useEffect, useRef } from 'react';
import {
  Video, Lightbulb, BeakerIcon, CheckCircle, Clock, Search,
  Send, Edit, Upload, Eye, FileText, Plus, X, Menu, Settings, PlaySquare, ChevronRight, Home, List, ThumbsUp, MessagesSquare
} from 'lucide-react';

// =======================
// ASYNC STORAGE API (Vercel KV or LocalStorage Fallback)
// =======================
const getKvUrl = () => import.meta.env.VITE_KV_REST_API_URL;
const getKvToken = () => import.meta.env.VITE_KV_REST_API_TOKEN;

const vercelRest = async (method, path, body = null) => {
  const res = await fetch(`${getKvUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${getKvToken()}` },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
};

window.storage = {
  get: async (key) => {
    if (getKvUrl()) {
      const res = await vercelRest('GET', `/get/${key}`);
      return res?.result ? JSON.parse(res.result) : null;
    }
    return JSON.parse(localStorage.getItem(key) || 'null');
  },
  set: async (key, value) => {
    value.shared = true;
    if (getKvUrl()) {
      await vercelRest('POST', `/set/${key}`, JSON.stringify(value));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
  delete: async (key) => {
    if (getKvUrl()) {
      await vercelRest('POST', `/del/${key}`);
    } else {
      localStorage.removeItem(key);
    }
  },
  list: async () => {
    if (getKvUrl()) {
      const res = await vercelRest('POST', `/keys/*`);
      const keys = res?.result || [];
      if (!keys || keys.length === 0) return [];
      const mgetRes = await vercelRest('POST', `/mget`, keys);
      const values = mgetRes?.result || [];
      return keys.map((key, i) => ({ key, value: values[i] ? JSON.parse(values[i]) : null }));
    }
    return Object.entries(localStorage).map(([key, value]) => ({ key, value: JSON.parse(value) }));
  }
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const compressImage = (file, maxWidth = 1280, quality = 0.78) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

// =======================
// SHARED HOOK / API
// =======================
const useAppStorage = () => {
  const [data, setData] = useState({ videos: [], ideias: [], testes: [] });

  const loadData = async () => {
    try {
      const items = await window.storage.list();
      const videos = items.filter(i => i.key.startsWith('videos:') && i.value).map(i => i.value);
      const ideias = items.filter(i => i.key.startsWith('ideias:') && i.value).map(i => i.value);
      const testes = items.filter(i => i.key.startsWith('testes-ab:') && i.value).map(i => i.value);
      setData({ 
        videos: videos.sort((a,b) => new Date(b.dataEnvio) - new Date(a.dataEnvio)), 
        ideias: ideias.sort((a,b) => new Date(b.dataCriacao) - new Date(a.dataCriacao)), 
        testes: testes.sort((a,b) => new Date(b.dataInicio) - new Date(a.dataInicio)) 
      });
    } catch (e) {
      console.error('Storage error', e);
    }
  };

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const saveItem = async (prefix, item) => {
    await window.storage.set(`${prefix}:${item.id}`, item);
    loadData();
  };

  const deleteItem = async (prefix, id) => {
    await window.storage.delete(`${prefix}:${id}`);
    loadData();
  };

  return { data, saveItem, deleteItem, loadData };
};

// =======================
// REUSABLE COMPONENTS
// =======================
const Card = ({ children, className = '' }) => (
  <div className={`bg-dark-800 rounded-xl border border-dark-700 shadow-sm p-5 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.blue}`}>
      {children}
    </span>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Enviado': return 'gray';
    case 'Em Edição': return 'blue';
    case 'Entregue': return 'yellow';
    case 'Em Revisão': return 'purple';
    case 'Aprovado': return 'green';
    default: return 'gray';
  }
};

const Input = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>}
    <input 
      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      {...props} 
    />
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>}
    <textarea 
      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      rows={4}
      {...props} 
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>}
    <select 
      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      {...props} 
    >
      {options.map((opt, i) => (
        <option key={i} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const base = "inline-flex items-center justify-center font-medium rounded-lg px-4 py-2.5 transition-all text-sm";
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20",
    secondary: "bg-secondary hover:bg-secondary-hover text-dark-900 shadow-lg shadow-secondary/20",
    outline: "border border-dark-600 hover:border-slate-500 hover:bg-dark-800 text-slate-300",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Modal = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
        <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors p-1"><X size={20} /></button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-dark-700 flex justify-end gap-3 bg-dark-900/50 rounded-b-2xl">
          {footer}
        </div>
      )}
    </div>
  </div>
);


const ThumbUpload = ({ label, thumbs, onChange, maxFiles = 6 }) => {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files) => {
    const remaining = maxFiles - thumbs.length;
    if (remaining <= 0) return;
    setLoading(true);
    const compressed = await Promise.all(Array.from(files).slice(0, remaining).map(f => compressImage(f)));
    onChange([...thumbs, ...compressed]);
    setLoading(false);
  };

  const removeThumb = (idx) => onChange(thumbs.filter((_, i) => i !== idx));

  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>}
      <div
        className="border-2 border-dashed border-dark-600 hover:border-primary/60 rounded-lg p-5 text-center cursor-pointer transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {loading ? (
          <p className="text-sm text-slate-400">Comprimindo imagens...</p>
        ) : (
          <>
            <Upload size={22} className="mx-auto text-slate-500 mb-1.5" />
            <p className="text-sm text-slate-400">Clique ou arraste as thumbnails aqui</p>
            <p className="text-xs text-slate-600 mt-0.5">JPG, PNG • máx {maxFiles} imagens</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      {thumbs.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {thumbs.map((src, i) => (
            <div key={i} className="relative group aspect-video">
              <img src={src} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover rounded border border-dark-700" />
              <button
                type="button"
                onClick={() => removeThumb(i)}
                className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =======================
// VIEWS - OWNER
// =======================

const OwnerDashboard = ({ videos }) => {
  const stats = [
    { label: 'Em Edição', value: videos.filter(v => v.status === 'Em Edição').length, icon: Edit, color: 'text-blue-400' },
    { label: 'Entregues', value: videos.filter(v => v.status === 'Entregue').length, icon: CheckCircle, color: 'text-yellow-400' },
    { label: 'Em Revisão', value: videos.filter(v => v.status === 'Em Revisão').length, icon: Eye, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Visão Geral</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="flex items-center p-6 gap-4">
            <div className={`p-4 rounded-xl bg-dark-900 ${stat.color} border border-dark-700`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">Últimos Vídeos</h3>
      <div className="grid gap-4">
        {videos.slice(0, 5).map(v => (
          <Card key={v.id} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-dark-900 rounded-lg text-primary">
                <Video size={20} />
              </div>
              <div>
                <h4 className="font-medium text-slate-200">{v.titulo}</h4>
                <p className="text-sm text-slate-500">Enviado em {new Date(v.dataEnvio).toLocaleDateString()}</p>
              </div>
            </div>
            <Badge color={getStatusColor(v.status)}>{v.status}</Badge>
          </Card>
        ))}
        {videos.length === 0 && <p className="text-slate-500 italic">Nenhum vídeo cadastrado.</p>}
      </div>
    </div>
  );
};

const NovoBriefing = ({ onSave }) => {
  const [form, setForm] = useState({
    titulo: '', linkDrive: '', textoThumbA: '', textoThumbB: '', textoThumbC: '',
    descricao: '', insercoes: 'Moderadas', observacoes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave('videos', {
      ...form, id: generateId(), status: 'Enviado', dataEnvio: new Date().toISOString(),
      entrega: null, revisoes: []
    });
    setForm({ titulo: '', linkDrive: '', textoThumbA: '', textoThumbB: '', textoThumbC: '', descricao: '', insercoes: 'Moderadas', observacoes: '' });
    alert('Briefing enviado com sucesso!');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Novo Briefing de Vídeo</h2>
      </div>
      <Card>
        <form onSubmit={handleSubmit}>
          <Input label="Título do Vídeo" required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ex: Como ganhar dinheiro na internet em 2024" />
          <Input label="Link do Google Drive (Bruto)" type="url" required value={form.linkDrive} onChange={e => setForm({...form, linkDrive: e.target.value})} placeholder="https://drive.google.com/..." />
          
          <div className="my-6">
            <label className="block text-sm font-medium text-slate-400 mb-2">Testes A/B de Thumbnail (Opções de Texto)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Opção A" required value={form.textoThumbA} onChange={e => setForm({...form, textoThumbA: e.target.value})} />
              <Input placeholder="Opção B" required value={form.textoThumbB} onChange={e => setForm({...form, textoThumbB: e.target.value})} />
              <Input placeholder="Opção C" required value={form.textoThumbC} onChange={e => setForm({...form, textoThumbC: e.target.value})} />
            </div>
          </div>

          <Textarea label="Descrição / Briefing (o que você espera da edição)" required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
          
          <Select label="Quantidade de Inserções (B-rolls, memes, etc)" 
            options={[{value:'Poucas', label:'Poucas (Mais clean)'}, {value:'Moderadas', label:'Moderadas'}, {value:'Muitas', label:'Muitas (Dinâmico/Retenção)'}, {value:'A critério do editor', label:'A critério do editor'}]}
            value={form.insercoes} onChange={e => setForm({...form, insercoes: e.target.value})} 
          />
          
          <Textarea label="Observações Adicionais (opcional)" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} />
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" className="w-full md:w-auto"><Send size={18} className="mr-2" /> Enviar para Editor</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const RevisaoEntregas = ({ videos, saveItem }) => {
  const filtrados = videos.filter(v => v.status === 'Entregue' || v.status === 'Em Revisão');
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');

  const handleOpen = (v) => {
    if (v.status === 'Entregue') {
      const updated = { ...v, status: 'Em Revisão' };
      saveItem('videos', updated);
      setSelected(updated);
    } else {
      setSelected(v);
    }
  };

  const handleApprove = async () => {
    await saveItem('videos', { ...selected, status: 'Aprovado' });
    setSelected(null);
  };

  const handleRequestAdjustments = async () => {
    if (!feedback) return alert('Digite os ajustes necessários.');
    const revisao = { tipo: 'Ajuste', feedback, data: new Date().toISOString() };
    await saveItem('videos', { 
      ...selected, 
      status: 'Em Edição', 
      revisoes: [...(selected.revisoes || []), revisao] 
    });
    setFeedback('');
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Revisão de Entregas</h2>
      <div className="grid gap-4">
        {filtrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle size={48} className="mx-auto text-dark-600 mb-4" />
            <p>Nenhuma entrega pendente de revisão no momento.</p>
          </div>
        ) : (
          filtrados.map(v => (
            <Card key={v.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-lg text-slate-100">{v.titulo}</h4>
                  <Badge color={getStatusColor(v.status)}>{v.status}</Badge>
                </div>
                <p className="text-sm text-slate-400">Entregue em: {v.entrega?.dataEntrega ? new Date(v.entrega.dataEntrega).toLocaleString() : 'N/A'}</p>
              </div>
              <Button onClick={() => handleOpen(v)}><Eye size={18} className="mr-2"/> Revisar</Button>
            </Card>
          ))
        )}
      </div>

      {selected && (
        <Modal 
          title={`Revisão: ${selected.titulo}`} 
          onClose={() => setSelected(null)}
          footer={<>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button variant="secondary" onClick={handleApprove}><CheckCircle size={18} className="mr-2"/> Aprovar Vídeo</Button>
          </>}
        >
          <div className="space-y-6">
            <div className="bg-dark-900 p-4 rounded-lg flex gap-4 items-start border border-dark-700">
              <PlaySquare className="text-primary mt-1" size={24} />
              <div>
                <h4 className="text-slate-300 font-medium mb-1">Link do Vídeo Final</h4>
                <a href={selected.entrega?.linkEditado} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                  {selected.entrega?.linkEditado}
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-slate-300 font-medium mb-3">Thumbnails Enviadas</h4>
              {selected.entrega?.thumbs?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selected.entrega.thumbs.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer" className="block relative aspect-video bg-dark-900 border border-dark-700 rounded overflow-hidden hover:border-primary transition-colors group">
                       <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display='none'} />
                       <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-xs bg-dark-900 px-2 py-1 rounded border border-dark-600">Abrir Imagem</span>
                       </div>
                    </a>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">Nenhuma thumbnail anexada.</p>}
            </div>

            {selected.entrega?.obsEditor && (
              <div className="bg-dark-900/50 p-4 rounded-lg border border-dark-700">
                <span className="text-xs font-semibold text-slate-400 uppercase">Observações do Editor</span>
                <p className="text-slate-300 mt-1 whitespace-pre-wrap">{selected.entrega.obsEditor}</p>
              </div>
            )}

            <div className="border-t border-dark-700 pt-6">
              <h4 className="text-slate-300 font-medium mb-2">Solicitar Ajustes</h4>
              <Textarea placeholder="Descreva os ajustes necessários..." value={feedback} onChange={e => setFeedback(e.target.value)} />
              <Button onClick={handleRequestAdjustments} variant="danger" className="w-full">
                Mandar de Volta para Edição
              </Button>
            </div>
            
            {selected.revisoes?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm text-slate-400 mb-2">Histórico de Ajustes</h4>
                <div className="space-y-2">
                  {selected.revisoes.map((r, i) => (
                    <div key={i} className="bg-dark-900 p-3 rounded border border-dark-700 text-sm">
                      <span className="text-slate-500 block mb-1">{new Date(r.data).toLocaleString()}</span>
                      {r.feedback}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

const BancoIdeias = ({ ideias, saveItem, deleteItem, currentUser }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'Média', status: 'Ideia' });
  const [viewIdeia, setViewIdeia] = useState(null);
  const [comment, setComment] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveItem('ideias', {
      ...form, id: generateId(), criadoPor: currentUser, dataCriacao: new Date().toISOString(), comentarios: []
    });
    setForm({ titulo: '', descricao: '', prioridade: 'Média', status: 'Ideia' });
    setModalOpen(false);
  };

  const addComment = async () => {
    if(!comment) return;
    const updatedComments = [...(viewIdeia.comentarios || []), { author: currentUser, text: comment, date: new Date().toISOString() }];
    
    await saveItem('ideias', {
      ...viewIdeia,
      comentarios: updatedComments
    });
    
    setViewIdeia({...viewIdeia, comentarios: updatedComments});
    setComment('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Banco de Ideias</h2>
        <Button onClick={() => setModalOpen(true)}><Plus size={18} className="mr-2"/> Nova Ideia</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ideias.map(i => (
          <Card key={i.id} className="flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <Badge color={i.prioridade === 'Alta' ? 'red' : i.prioridade === 'Média' ? 'yellow' : 'gray'}>{i.prioridade}</Badge>
              <Badge color={i.status === 'Aprovada' ? 'green' : 'blue'}>{i.status}</Badge>
            </div>
            <h4 className="font-semibold text-lg text-slate-200 mb-2">{i.titulo}</h4>
            <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-1">{i.descricao}</p>
            <div className="flex justify-between items-center pt-4 border-t border-dark-700">
              <span className="text-xs text-slate-500">{i.comentarios?.length || 0} comments</span>
              <button className="text-primary hover:text-primary-hover text-sm font-medium" onClick={() => setViewIdeia(i)}>Ver / Editar</button>
            </div>
          </Card>
        ))}
        {ideias.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
             <Lightbulb size={48} className="mx-auto text-dark-600 mb-4" />
             <p>Nenhuma ideia registrada. Comece seu brainstorming!</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal title="Nova Ideia de Vídeo" onClose={() => setModalOpen(false)} footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar Ideia</Button>
        </>}>
           <Input label="Título" required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} />
           <Select label="Prioridade" options={[{value:'Alta', label:'Alta'}, {value:'Média', label:'Média'}, {value:'Baixa', label:'Baixa'}]} value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})} />
           <Select label="Status" options={[{value:'Ideia', label:'Ideia'}, {value:'Aprovada', label:'Aprovada'}, {value:'Em produção', label:'Em produção'}, {value:'Descartada', label:'Descartada'}]} value={form.status} onChange={e => setForm({...form, status: e.target.value})} />
           <Textarea label="Descrição" required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
        </Modal>
      )}

      {viewIdeia && (
        <Modal title={viewIdeia.titulo} onClose={() => setViewIdeia(null)}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge color={viewIdeia.prioridade === 'Alta' ? 'red' : 'gray'}>Prioridade: {viewIdeia.prioridade}</Badge>
              <Badge color="blue">Status: {viewIdeia.status}</Badge>
            </div>
            <p className="text-slate-300 p-4 bg-dark-900 rounded-lg border border-dark-700 whitespace-pre-wrap">{viewIdeia.descricao}</p>
            <div className="text-xs text-slate-500 text-right">Criado por {viewIdeia.criadoPor} em {new Date(viewIdeia.dataCriacao).toLocaleDateString()}</div>
            
            <div className="mt-6 pt-6 border-t border-dark-700">
              <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><MessagesSquare size={16} className="mr-2"/> Comentários</h4>
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {viewIdeia.comentarios?.map((c, i) => (
                  <div key={i} className="bg-dark-900 p-3 rounded-lg border border-dark-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-primary">{c.author}</span>
                      <span className="text-[10px] text-slate-500">{new Date(c.date).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-300">{c.text}</p>
                  </div>
                ))}
                {!viewIdeia.comentarios?.length && <p className="text-xs text-slate-500">Nenhum comentário.</p>}
              </div>
              <div className="flex gap-2">
                <input type="text" className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-primary" placeholder="Adicionar comentário..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && addComment()} />
                <Button onClick={addComment} className="px-3 py-2"><Send size={16}/></Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const HistoricoGeral = ({ videos }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const filtered = videos.filter(v => {
    const matchSearch = v.titulo.toLowerCase().includes(filter.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Histórico de Vídeos</h2>
      <Card className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-500" />
          <input 
            type="text" placeholder="Buscar por título..."
            className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 outline-none focus:border-primary"
            value={filter} onChange={e => setFilter(e.target.value)}
          />
        </div>
        <select 
          className="bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none focus:border-primary"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        >
          {['Todos', 'Enviado', 'Em Edição', 'Entregue', 'Em Revisão', 'Aprovado'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Card>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-dark-900/50 text-slate-400 border-b border-dark-700">
            <tr>
              <th className="px-6 py-4 font-medium">Título</th>
              <th className="px-6 py-4 font-medium">Data Envio</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-dark-900/30 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-200">{v.titulo}</td>
                <td className="px-6 py-4">{new Date(v.dataEnvio).toLocaleDateString()}</td>
                <td className="px-6 py-4"><Badge color={getStatusColor(v.status)}>{v.status}</Badge></td>
                <td className="px-6 py-4">
                  <a href={v.linkDrive} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <FileText size={14}/> Bruto
                  </a>
                  {v.entrega?.linkEditado && (
                    <a href={v.entrega.linkEditado} target="_blank" rel="noreferrer" className="text-secondary hover:underline flex items-center gap-1 mt-1">
                      <PlaySquare size={14}/> Final
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Nenhum vídeo encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// =======================
// VIEWS - EDITOR
// =======================

const EditorDashboard = ({ videos }) => {
  const stats = [
    { label: 'Briefings Pendentes', value: videos.filter(v => v.status === 'Enviado' || v.status === 'Em Edição').length, icon: Send, color: 'text-orange-400' },
    { label: 'Aguardando Avaliação', value: videos.filter(v => v.status === 'Entregue' || v.status === 'Em Revisão').length, icon: Clock, color: 'text-purple-400' },
    { label: 'Aprovados', value: videos.filter(v => v.status === 'Aprovado').length, icon: CheckCircle, color: 'text-green-400' },
  ];

  const pendentes = videos.filter(v => v.status === 'Enviado' || v.status === 'Em Edição' || v.status === 'Em Revisão');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Painel do Editor</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="flex items-center p-6 gap-4 border-l-4" style={{borderLeftColor: 'currentColor', color: 'var(--tw-colors-blue-500)'}}>
            <div className={`p-4 rounded-xl bg-dark-900 ${stat.color} border border-dark-700`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">Seu Fila de Trabalho Ativa</h3>
      <div className="grid gap-4">
        {pendentes.map(v => (
          <Card key={v.id} className="flex border-l-4 border-primary">
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg text-slate-100">{v.titulo}</h4>
                <Badge color={getStatusColor(v.status)}>{v.status}</Badge>
              </div>
              <p className="text-sm text-slate-400 max-w-2xl line-clamp-2">{v.descricao}</p>
              {v.status === 'Em Revisão' && v.revisoes?.length > 0 && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 block">Ajuste Solicitado</span>
                  <p className="text-sm text-red-200">{v.revisoes[v.revisoes.length - 1].feedback}</p>
                </div>
              )}
            </div>
          </Card>
        ))}
        {pendentes.length === 0 && <p className="text-slate-500 italic">Oba! Fila de edição zerada no momento.</p>}
      </div>
    </div>
  );
};

const FilaEdicao = ({ videos, saveItem }) => {
  const pendentes = videos.filter(v => v.status !== 'Entregue' && v.status !== 'Aprovado');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ linkEditado: '', thumbs: [], obsEditor: '' });

  const handleOpen = (v) => {
    setSelected(v);
    if (v.status === 'Enviado') {
      saveItem('videos', { ...v, status: 'Em Edição' });
    }
  };

  const handleDeliver = async (e) => {
    e.preventDefault();
    await saveItem('videos', {
      ...selected,
      status: 'Entregue',
      entrega: {
        linkEditado: form.linkEditado,
        thumbs: form.thumbs,
        obsEditor: form.obsEditor,
        dataEntrega: new Date().toISOString()
      }
    });
    setSelected(null);
    setForm({ linkEditado: '', thumbs: [], obsEditor: '' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Fila de Edição</h2>
      
      <div className="grid gap-4">
        {pendentes.length === 0 ? (
           <div className="text-center py-12 text-slate-500 bg-dark-800 rounded-xl border border-dark-700">
             <CheckCircle size={48} className="mx-auto text-primary mb-4" />
             <p>Não há briefings pendentes.</p>
           </div>
        ) : (
          pendentes.map(v => (
            <Card key={v.id} className="hover:border-primary transition-colors">
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-lg text-slate-100">{v.titulo}</h4>
                    <Badge color={getStatusColor(v.status)}>{v.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 space-x-4">
                    <span>Enviado: {new Date(v.dataEnvio).toLocaleDateString()}</span>
                    <span>Inserções: <span className="text-slate-300 font-medium">{v.insercoes}</span></span>
                  </div>
                </div>
                <div className="self-start md:self-center">
                  <Button variant="outline" size="sm" onClick={() => handleOpen(v)}>Ver Briefing / Entregar</Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {selected && (
        <Modal 
          title="Briefing de Edição" 
          onClose={() => setSelected(null)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Material Bruto</h4>
                <a href={selected.linkDrive} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:text-primary-hover bg-primary/10 p-3 rounded border border-primary/20">
                  <Video size={20} /> Acessar Google Drive
                </a>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Briefing / Descrição</h4>
                <p className="text-slate-300 bg-dark-900 p-4 rounded-lg border border-dark-700 whitespace-pre-wrap">{selected.descricao}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Opções de Thumbnails Requeridas</h4>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                  <li><strong>A:</strong> {selected.textoThumbA}</li>
                  <li><strong>B:</strong> {selected.textoThumbB}</li>
                  <li><strong>C:</strong> {selected.textoThumbC}</li>
                </ul>
              </div>
              
              {selected.observacoes && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Observações</h4>
                  <p className="text-slate-400 text-sm">{selected.observacoes}</p>
                </div>
              )}

              {selected.revisoes?.length > 0 && (
                <div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      ⚠ Ajuste solicitado pelo dono
                    </h4>
                    <p className="text-sm text-red-200 whitespace-pre-wrap">
                      {selected.revisoes[selected.revisoes.length - 1].feedback}
                    </p>
                    <span className="text-[11px] text-red-400/60 mt-2 block">
                      {new Date(selected.revisoes[selected.revisoes.length - 1].data).toLocaleString()}
                    </span>
                  </div>
                  {selected.revisoes.length > 1 && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                        Ver histórico completo ({selected.revisoes.length} revisões)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {selected.revisoes.slice(0, -1).map((r, i) => (
                          <div key={i} className="bg-dark-900 p-3 rounded border border-dark-700 text-sm">
                            <span className="text-slate-500 block mb-1 text-xs">{new Date(r.data).toLocaleString()}</span>
                            <p className="text-slate-400">{r.feedback}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="bg-dark-900/50 p-6 rounded-xl border border-dark-700">
              <h3 className="text-lg font-medium text-white mb-4 border-b border-dark-700 pb-2 flex items-center"><Upload size={18} className="mr-2"/> Painel de Entrega</h3>
              <form onSubmit={handleDeliver} className="space-y-4">
                <Input label="Link do Vídeo Finalizado (Google Drive/Frame.io)" required value={form.linkEditado} onChange={e => setForm({...form, linkEditado: e.target.value})} placeholder="URL do vídeo final" />
                
                <ThumbUpload
                  label="Thumbnails (arraste ou clique para enviar)"
                  thumbs={form.thumbs}
                  onChange={(thumbs) => setForm({ ...form, thumbs })}
                  maxFiles={6}
                />

                <Textarea label="Suas observações para o dono do canal" value={form.obsEditor} onChange={e => setForm({...form, obsEditor: e.target.value})} />

                <div className="mt-6">
                  <Button type="submit" variant="primary" className="w-full">
                    <CheckCircle size={18} className="mr-2"/> Entregar Vídeo
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const GestaoTestesAB = ({ testes, videos, saveItem }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ videoId: '', thumbs: [] });
  const videosAprovados = videos.filter(v => v.status === 'Aprovado');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveItem('testes-ab', {
      videoId: form.videoId,
      thumbAtual: form.thumbs[0] || '',
      novaThumb1: form.thumbs[1] || '',
      novaThumb2: form.thumbs[2] || '',
      id: generateId(), status: 'Ativo', dataInicio: new Date().toISOString()
    });
    setForm({ videoId: '', thumbs: [] });
    setModalOpen(false);
  };

  const encerrarTeste = async (id) => {
    const res = prompt('Qual foi a thumbnail vencedora? (Atual / Opção 1 / Opção 2)');
    if(res) {
      const teste = testes.find(t => t.id === id);
      await saveItem('testes-ab', { ...teste, status: 'Encerrado', resultado: res, dataEncerramento: new Date().toISOString() });
    }
  };

  const getVideoName = (id) => videos.find(v => v.id === id)?.titulo || 'Vídeo Desconhecido';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Testes A/B de Thumbnails</h2>
        <Button onClick={() => setModalOpen(true)}><BeakerIcon size={18} className="mr-2"/> Iniciar Teste</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testes.map(t => (
          <Card key={t.id} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-2 h-full ${t.status === 'Ativo' ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
            <div className="flex justify-between items-start mb-4 pr-4">
              <div>
                <Badge color={t.status === 'Ativo' ? 'blue' : 'gray'}>{t.status}</Badge>
                <h4 className="font-semibold text-slate-200 mt-2 text-lg">{getVideoName(t.videoId)}</h4>
                <p className="text-xs text-slate-500">Iniciado em {new Date(t.dataInicio).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs text-slate-400">
              {[{ label: 'Atual', src: t.thumbAtual }, { label: 'Opção 1', src: t.novaThumb1 }, { label: 'Opção 2', src: t.novaThumb2 }].map(({ label, src }) => (
                <div key={label} className="bg-dark-900 border border-dark-700 rounded overflow-hidden">
                  <span className="block py-1 font-medium text-slate-300 text-[11px]">{label}</span>
                  {src ? (
                    <img src={src} alt={label} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="aspect-video flex items-center justify-center text-slate-600 text-[10px]">—</div>
                  )}
                </div>
              ))}
            </div>

            {t.status === 'Ativo' ? (
              <Button variant="outline" className="w-full mt-4" onClick={() => encerrarTeste(t.id)}>Encerrar Teste</Button>
            ) : (
              <div className="mt-4 p-3 bg-secondary/10 border border-secondary/20 rounded-lg text-center">
                <span className="text-secondary font-medium text-sm">🏆 Vencedor: {t.resultado}</span>
              </div>
            )}
          </Card>
        ))}
        {testes.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
             <BeakerIcon size={48} className="mx-auto text-dark-600 mb-4" />
             <p>Nenhum teste A/B em andamento.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal title="Novo Teste A/B" onClose={() => setModalOpen(false)} footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.videoId || form.thumbs.length < 2}>Iniciar Teste</Button>
        </>}>
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Selecione o Vídeo (Aprovados)</label>
              <select className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-slate-200 outline-none focus:border-primary"
                value={form.videoId} onChange={e => setForm({ ...form, videoId: e.target.value })} required>
                <option value="">-- Selecione --</option>
                {videosAprovados.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
              </select>
            </div>
            <ThumbUpload
              label="Thumbnails (1ª = Atual/Controle · 2ª = Opção 1 · 3ª = Opção 2 opcional)"
              thumbs={form.thumbs}
              onChange={(thumbs) => setForm({ ...form, thumbs })}
              maxFiles={3}
            />
            {form.thumbs.length < 2 && (
              <p className="text-xs text-yellow-500/80">Envie pelo menos 2 imagens para iniciar o teste.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};


// =======================
// MAIN APP LAYOUT & ROUTING
// =======================

export default function App() {
  const [mode, setMode] = useState(null); // 'owner' | 'editor'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data, saveItem, deleteItem } = useAppStorage();

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
        <div className="max-w-md w-full bg-dark-800 border border-dark-700 p-8 rounded-2xl shadow-2xl text-center fade-in">
          <div className="w-20 h-20 bg-dark-900 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-inner border border-dark-700">
             <Video className="text-primary w-10 h-10" />
            <div className="absolute w-20 h-20 bg-primary/20 blur-xl rounded-full -z-10 animate-pulse"></div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Vflow<span className="text-primary">.io</span></h1>
          <p className="text-slate-400 mb-8">Plataforma de Gestão de Vídeos</p>
          
          <div className="space-y-4">
            <button 
              onClick={() => { setMode('owner'); setActiveTab('dashboard'); }}
              className="w-full flex items-center justify-between p-4 bg-dark-900 border border-dark-700 hover:border-blue-500/50 hover:bg-dark-800 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <span className="font-bold text-xl block leading-none w-6 text-center">🎬</span>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-200">Dono do Canal</h3>
                  <p className="text-xs text-slate-500">Gerenciar envios e revisar edições</p>
                </div>
              </div>
              <ChevronRight className="text-slate-600 group-hover:text-blue-500 transition-colors" />
            </button>
            
            <button 
              onClick={() => { setMode('editor'); setActiveTab('dashboard'); }}
              className="w-full flex items-center justify-between p-4 bg-dark-900 border border-dark-700 hover:border-secondary/50 hover:bg-dark-800 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-secondary/10 p-2 rounded-lg text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                  <span className="font-bold text-xl block leading-none w-6 text-center">✂️</span>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-200">Editor de Vídeo</h3>
                  <p className="text-xs text-slate-500">Acessar fila e enviar materiais</p>
                </div>
              </div>
              <ChevronRight className="text-slate-600 group-hover:text-secondary transition-colors" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ownerTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'novo', label: 'Novo Briefing', icon: Plus },
    { id: 'revisao', label: 'Revisão', icon: Eye },
    { id: 'ideias', label: 'Ideias', icon: Lightbulb },
    { id: 'historico', label: 'Histórico', icon: List }
  ];

  const editorTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'fila', label: 'Fila de Edição', icon: Edit },
    { id: 'testes', label: 'Testes A/B', icon: BeakerIcon },
    { id: 'ideias', label: 'Ideias', icon: Lightbulb },
    { id: 'historico', label: 'Histórico', icon: List }
  ];

  const tabs = mode === 'owner' ? ownerTabs : editorTabs;

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-dark-800 border-r border-dark-700 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-dark-700 border-opacity-50">
           <Video className={`w-6 h-6 mr-2 ${mode === 'owner' ? 'text-primary' : 'text-secondary'}`} />
           <span className="text-lg font-bold text-white tracking-wide">Vflow<span className={mode === 'owner' ? 'text-primary' : 'text-secondary'}>.io</span></span>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
                activeTab === tab.id 
                  ? `${mode === 'owner' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}` 
                  : 'text-slate-400 hover:bg-dark-900 hover:text-slate-200'
              }`}
            >
              <tab.icon className={`w-5 h-5 mr-3 ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`} />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-dark-700">
          <div className="flex items-center gap-3 mb-4">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${mode === 'owner' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                {mode === 'owner' ? '🎬' : '✂️'}
             </div>
             <div>
               <p className="text-sm font-semibold text-slate-200">{mode === 'owner' ? 'Dono do Canal' : 'Editor'}</p>
               <p className="text-xs text-slate-500">Modo Ativo</p>
             </div>
          </div>
          <button 
            onClick={() => setMode(null)}
            className="w-full text-left text-xs text-slate-500 hover:text-white transition-colors flex items-center"
          >
            <Settings className="w-3 h-3 mr-2" /> Trocar de Modo
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-dark-800 border-b border-dark-700 flex items-center justify-between px-4">
           <span className="text-lg font-bold text-white tracking-wide">Vflow</span>
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-300 p-2">
             <Menu />
           </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-dark-900 p-4 md:p-8 custom-scrollbar relative">
          <div className="max-w-6xl mx-auto h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {mode === 'owner' && (
              <>
                {activeTab === 'dashboard' && <OwnerDashboard videos={data.videos} />}
                {activeTab === 'novo' && <NovoBriefing onSave={saveItem} />}
                {activeTab === 'revisao' && <RevisaoEntregas videos={data.videos} saveItem={saveItem} />}
                {activeTab === 'ideias' && <BancoIdeias ideias={data.ideias} saveItem={saveItem} deleteItem={deleteItem} currentUser="Dono" />}
                {activeTab === 'historico' && <HistoricoGeral videos={data.videos} />}
              </>
            )}

            {mode === 'editor' && (
              <>
                {activeTab === 'dashboard' && <EditorDashboard videos={data.videos} />}
                {activeTab === 'fila' && <FilaEdicao videos={data.videos} saveItem={saveItem} />}
                {activeTab === 'testes' && <GestaoTestesAB testes={data.testes} videos={data.videos} saveItem={saveItem} />}
                {activeTab === 'ideias' && <BancoIdeias ideias={data.ideias} saveItem={saveItem} deleteItem={deleteItem} currentUser="Editor" />}
                {activeTab === 'historico' && <HistoricoGeral videos={data.videos} />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
