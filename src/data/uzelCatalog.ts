export interface UzelCategory {
  slug: string
  title: string
  description: string
  accent?: string
}

export const uzelCategories: UzelCategory[] = [
  {
    slug: 'with-meter',
    title: 'Узлы с счетчиком',
    description: 'Готовые к учету воды комплекты с интегрированным счетчиком и байпасом.',
  },
  {
    slug: 'no-meter',
    title: 'Узлы без счетчика',
    description: 'Минимальные узлы без учета — компактная врезка с запорной арматурой.',
  },
  {
    slug: 'cold-only',
    title: 'Узлы только с ХВС',
    description: 'Одноконтурные решения под холодное водоснабжение, защита от гидроудара.',
  },
  {
    slug: 'dual-circuit',
    title: 'Узлы ГВС + ХВС',
    description: 'Два контура с балансировкой, обратными клапанами и фильтрацией.',
  },
  {
    slug: 'smart-ready',
    title: 'Узлы с подготовкой под умный дом',
    description: 'Монтажные комплекты с местами под датчики протечки и сервоприводы.',
  },
  {
    slug: 'premium-finish',
    title: 'Премиальная отделка',
    description: 'Скрытые крепления, закрытые панели, лаконичная лицевая геометрия.',
  },
]












