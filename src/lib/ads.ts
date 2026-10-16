import skincare from '@/assets/skincare.jpg';
import sneakers from '@/assets/sneakers.jpg';
import coffee from '@/assets/coffee.jpg';

export type Ad = {
  id: number | string;
  campaign: string;
  title: string;
  copy: string;
  imageUrl: string;
  format: string;
  clicks: number;
  spent: number;
  conversations?: number;
  status: 'Ativo' | 'Pausado';
};

export const ads: Ad[] = [
  { id: 1, campaign: 'Essência · Coleção natural', title: 'Sua pele, em sua melhor essência.', copy: 'Um novo ritual de cuidado começa aqui. Descubra ingredientes naturais que hidratam, renovam e respeitam a sua pele.', imageUrl: skincare, format: 'Feed Instagram', clicks: 1248, spent: 486.50, status: 'Ativo' },
  { id: 2, campaign: 'Urban · Nova coleção', title: 'Seu próximo passo tem estilo.', copy: 'Conforto para acompanhar seu ritmo. Conheça a nova coleção Urban e encontre o par que combina com você.', imageUrl: sneakers, format: 'Feed Instagram', clicks: 956, spent: 378.20, status: 'Ativo' },
  { id: 3, campaign: 'Café Aurora · Experiência', title: 'Uma pausa que muda o seu dia.', copy: 'Café especial, feito com calma e servido com carinho. Transforme os pequenos momentos no melhor da sua rotina.', imageUrl: coffee, format: 'Feed Facebook', clicks: 684, spent: 245.80, status: 'Pausado' },
  { id: 4, campaign: 'Essência · Coleção natural', title: 'O cuidado que vem da natureza.', copy: 'Menos excessos, mais essência. Sinta a leveza de uma fórmula criada para cuidar de você todos os dias.', imageUrl: skincare, format: 'Stories Instagram', clicks: 872, spent: 312.40, status: 'Ativo' },
  { id: 5, campaign: 'Urban · Nova coleção', title: 'Feito para ir com você.', copy: 'Da primeira caminhada ao último compromisso. Design atemporal e conforto em cada passo do seu dia.', imageUrl: sneakers, format: 'Feed Facebook', clicks: 523, spent: 218.90, status: 'Pausado' },
  { id: 6, campaign: 'Café Aurora · Experiência', title: 'Seu novo momento favorito.', copy: 'Aroma que acolhe, sabor que fica. Experimente nossos cafés especiais e descubra o prazer de uma boa pausa.', imageUrl: coffee, format: 'Stories Instagram', clicks: 1106, spent: 407.60, status: 'Ativo' },
];

export const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const number = (value: number) => new Intl.NumberFormat('pt-BR').format(value);