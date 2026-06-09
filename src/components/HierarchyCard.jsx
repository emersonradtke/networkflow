import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Users, TrendingUp, ChevronRight, Star, Award, Crown, Zap, Shield } from 'lucide-react';

// Níveis conforme plano de marketing
const LEVELS = [
  {
    name: 'Líder',
    minNetwork: 5,
    avgEarning: 50,
    color: '#3B9EE2',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    icon: Star,
    description: 'Primeira conquista na rede',
  },
  {
    name: 'Supervisor',
    minNetwork: 30,
    avgEarning: 300,
    color: '#2563EB',
    bgColor: 'bg-blue-200',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-400',
    icon: Shield,
    description: 'Expansão da sua equipe',
  },
  {
    name: 'Coordenador',
    minNetwork: 155,
    avgEarning: 1550,
    color: '#1D4ED8',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-400',
    icon: Zap,
    description: 'Liderança consolidada',
  },
  {
    name: 'Gerente',
    minNetwork: 780,
    avgEarning: 7800,
    color: '#1e3a8a',
    bgColor: 'bg-indigo-200',
    textColor: 'text-indigo-900',
    borderColor: 'border-indigo-500',
    icon: Award,
    description: 'Alto desempenho em rede',
  },
  {
    name: 'Diretor',
    minNetwork: 3905,
    avgEarning: 39050,
    color: '#1B2A5E',
    bgColor: 'bg-slate-800',
    textColor: 'text-white',
    borderColor: 'border-slate-600',
    icon: Crown,
    description: 'O topo da hierarquia',
  },
];

function getLevel(totalNetwork) {
  let current = null;
  let next = LEVELS[0];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalNetwork >= LEVELS[i].minNetwork) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }

  return { current, next };
}

export default function HierarchyCard({ associate }) {
  const [totalNetwork, setTotalNetwork] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!associate?.id) return;
    loadNetworkCount();
  }, [associate?.id]);

  const loadNetworkCount = async () => {
    try {
      // Conta recursivamente toda a rede (diretos + indiretos)
      let count = 0;
      let queue = [associate.id];
      const visited = new Set();

      while (queue.length > 0) {
        const batch = queue.splice(0, 10);
        const results = await Promise.all(
          batch.map(id => base44.entities.Associate.filter({ sponsor_id: id }))
        );
        for (const members of results) {
          for (const m of members) {
            if (!visited.has(m.id)) {
              visited.add(m.id);
              count++;
              queue.push(m.id);
            }
          }
        }
      }

      setTotalNetwork(count);
    } catch (err) {
      console.error('Erro ao carregar rede:', err);
    } finally {
      setLoading(false);
    }
  };

  const { current, next } = getLevel(totalNetwork);
  const progressToNext = next
    ? Math.min(100, Math.round((totalNetwork / next.minNetwork) * 100))
    : 100;

  const Icon = current?.icon || Star;

  return (
    <>
      <div
        className="dark-card rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all"
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Minha Classificação</p>
          <ChevronRight size={14} className="text-muted-foreground" />
        </div>

        {loading ? (
          <div className="h-14 bg-secondary rounded-xl animate-pulse" />
        ) : (
          <>
            {current ? (
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${current.color}20`, border: `1.5px solid ${current.color}40` }}
                >
                  <Icon size={24} style={{ color: current.color }} />
                </div>
                <div>
                  <p className="text-xl font-black text-foreground">{current.name}</p>
                  <p className="text-xs text-muted-foreground">{current.description}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Users size={22} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-black text-foreground">Sem classificação</p>
                  <p className="text-xs text-muted-foreground">Conquiste {LEVELS[0].minNetwork} membros na rede para ser Líder</p>
                </div>
              </div>
            )}

            {/* Rede total */}
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users size={13} /> Rede total
              </span>
              <span className="font-bold text-foreground">{totalNetwork.toLocaleString('pt-BR')}</span>
            </div>

            {/* Progresso para próximo nível */}
            {next ? (
              <>
                <div className="w-full bg-secondary rounded-full h-2 mb-1">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${progressToNext}%`, background: `linear-gradient(90deg, #3B9EE2, #1B2A5E)` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{totalNetwork.toLocaleString('pt-BR')} / {next.minNetwork.toLocaleString('pt-BR')} para {next.name}</span>
                  <span className="font-semibold text-primary">{progressToNext}%</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Crown size={14} className="text-yellow-500" />
                <span className="text-xs font-semibold text-yellow-600">Nível máximo atingido!</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de detalhes */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy size={18} className="text-primary" />
              Plano de Hierarquia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Users size={13} /> Sua rede total</span>
              <span className="font-black text-primary text-lg">{totalNetwork.toLocaleString('pt-BR')}</span>
            </div>

            {LEVELS.map((level, idx) => {
              const LIcon = level.icon;
              const isActive = current?.name === level.name;
              const isReached = totalNetwork >= level.minNetwork;
              const isNext = next?.name === level.name;
              const missing = level.minNetwork - totalNetwork;

              return (
                <div
                  key={level.name}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md'
                      : isReached
                      ? 'border-green-300 bg-green-50 opacity-80'
                      : isNext
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-border bg-background opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: `${level.color}20` }}
                      >
                        <LIcon size={18} style={{ color: level.color }} />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{level.name}</p>
                        <p className="text-xs text-muted-foreground">{level.description}</p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Atual</span>
                    )}
                    {isReached && !isActive && (
                      <span className="text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">✓</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users size={11} /> Mínimo: <strong className="text-foreground">{level.minNetwork.toLocaleString('pt-BR')} pessoas</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp size={11} /> Ganho médio: <strong className="text-green-600">R$ {level.avgEarning.toLocaleString('pt-BR')}</strong>
                    </span>
                  </div>

                  {isNext && missing > 0 && (
                    <div className="mt-2 bg-blue-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <ChevronRight size={12} className="text-blue-600" />
                      <p className="text-xs text-blue-700 font-semibold">
                        Faltam <strong>{missing.toLocaleString('pt-BR')} pessoas</strong> para chegar aqui
                      </p>
                    </div>
                  )}

                  {!isReached && !isNext && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Faltam {(level.minNetwork - totalNetwork).toLocaleString('pt-BR')} pessoas
                    </div>
                  )}
                </div>
              );
            })}

            <p className="text-xs text-center text-muted-foreground pt-1">
              Os ganhos são estimativas com base na média do plano de marketing.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}