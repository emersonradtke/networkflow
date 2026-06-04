import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function CepAddressInput({ 
  cep, 
  setCep, 
  address, 
  setAddress, 
  neighborhood, 
  setNeighborhood, 
  city, 
  setCity, 
  state, 
  setState,
  number,
  setNumber,
  complement,
  setComplement,
  label = 'Endereço'
}) {
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);
  const [addressFound, setAddressFound] = useState(false);

  const searchCep = async () => {
    if (!cep || cep.replace(/\D/g, '').length !== 8) {
      toast({ title: 'CEP inválido', description: 'Informe um CEP válido com 8 dígitos.', variant: 'destructive' });
      return;
    }

    setSearching(true);
    try {
      const response = await base44.functions.invoke('searchCepAddress', { cep });
      
      if (response.data.success) {
        setAddress(response.data.address);
        setNeighborhood(response.data.neighborhood);
        setCity(response.data.city);
        setState(response.data.state);
        setAddressFound(true);
      } else {
        toast({ title: 'CEP não encontrado', description: response.data.error, variant: 'destructive' });
        setAddressFound(false);
      }
    } catch (error) {
      toast({ title: 'Erro ao buscar CEP', description: error.message, variant: 'destructive' });
      setAddressFound(false);
    } finally {
      setSearching(false);
    }
  };

  const handleCepChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
    setCep(val);
    setAddressFound(false);
  };

  const handleCepBlur = () => {
    if (cep && cep.length === 8) {
      searchCep();
    }
  };

  return (
    <div className="space-y-4">
      {/* CEP */}
      <div className="space-y-1.5">
        <Label className="text-xs">{label} — CEP <span className="text-red-500">*</span></Label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={cep}
              onChange={handleCepChange}
              onBlur={handleCepBlur}
              placeholder="12345678"
              maxLength={8}
              disabled={searching}
            />
            {addressFound && (
              <CheckCircle size={16} className="absolute right-3 top-2.5 text-green-600" />
            )}
            {searching && (
              <Loader2 size={16} className="absolute right-3 top-2.5 animate-spin text-primary" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Pressione Tab ou Enter para buscar</p>
      </div>

      {addressFound && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <p className="text-xs text-green-700 font-medium">Endereço preenchido automaticamente</p>
        </div>
      )}

      {/* Rua/Logradouro */}
      <div className="space-y-1.5">
        <Label className="text-xs">Rua/Logradouro <span className="text-red-500">*</span></Label>
        <Input
          value={address}
          onChange={e => {
            setAddress(e.target.value);
            setAddressFound(false);
          }}
          placeholder="Rua exemplo"
          disabled={addressFound && address}
        />
      </div>

      {/* Número */}
      <div className="space-y-1.5">
        <Label className="text-xs">Número <span className="text-red-500">*</span></Label>
        <Input
          value={number || ''}
          onChange={e => setNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="123"
          maxLength={10}
        />
      </div>

      {/* Complemento */}
      <div className="space-y-1.5">
        <Label className="text-xs">Complemento <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Input
          value={complement || ''}
          onChange={e => setComplement(e.target.value)}
          placeholder="Apto 42, sala 3..."
        />
      </div>

      {/* Bairro */}
      <div className="space-y-1.5">
        <Label className="text-xs">Bairro <span className="text-red-500">*</span></Label>
        <Input
          value={neighborhood}
          onChange={e => {
            setNeighborhood(e.target.value);
            setAddressFound(false);
          }}
          placeholder="Bairro"
          disabled={addressFound && neighborhood}
        />
      </div>

      {/* Cidade e Estado */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Cidade <span className="text-red-500">*</span></Label>
          <Input
            value={city}
            onChange={e => {
              setCity(e.target.value);
              setAddressFound(false);
            }}
            placeholder="São Paulo"
            disabled={addressFound && city}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Estado <span className="text-red-500">*</span></Label>
          <Select value={state} onValueChange={setState} disabled={addressFound && state}>
            <SelectTrigger>
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {STATES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}