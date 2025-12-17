import type { Product } from '@/types'

const fallbackProducts: Product[] = [
  {
    id: 900001,
    name: 'V01 | Узел с счетчиком',
    slug: 'v01-meter',
    sku: 'V01',
    price: 9000,
    old_price: null,
    currency: 'RUB',
    category_id: null,
    stock_quantity: 99,
    is_active: true,
    is_featured: false,
    short_description: 'Счётчик, фильтр, обратный клапан, демпфер, сервоприводы. Подготовка под умный дом.',
    main_image: null,
    description:
      'Демо‑карточка для каталога “Узел ввода”. Здесь будет описание комплектации, схемы подключения и варианты исполнения.',
  },
  {
    id: 900002,
    name: 'V02 | Узел без счетчика',
    slug: 'v02-clean',
    sku: 'V02',
    price: 10000,
    old_price: null,
    currency: 'RUB',
    category_id: null,
    stock_quantity: 99,
    is_active: true,
    is_featured: false,
    short_description: 'Компактная врезка без учета. Запорная арматура, фильтр, антивибрационные компенсаторы.',
    main_image: null,
    description:
      'Демо‑карточка для каталога “Узел ввода”. Здесь будет описание комплектации, схемы подключения и варианты исполнения.',
  },
  {
    id: 900003,
    name: 'V03 | Узел ХВС',
    slug: 'v03-cold',
    sku: 'V03',
    price: 15000,
    old_price: null,
    currency: 'RUB',
    category_id: null,
    stock_quantity: 99,
    is_active: true,
    is_featured: false,
    short_description: 'Только холодное водоснабжение. Защита от гидроудара, фильтр тонкой очистки.',
    main_image: null,
    description:
      'Демо‑карточка для каталога “Узел ввода”. Здесь будет описание комплектации, схемы подключения и варианты исполнения.',
  },
  {
    id: 900004,
    name: 'V04 | Узел ГВС + ХВС',
    slug: 'v04-dual',
    sku: 'V04',
    price: 12000,
    old_price: null,
    currency: 'RUB',
    category_id: null,
    stock_quantity: 99,
    is_active: true,
    is_featured: false,
    short_description: 'Два контура, балансировка, обратные клапаны, фильтрация. Готов к теплообменнику.',
    main_image: null,
    description:
      'Демо‑карточка для каталога “Узел ввода”. Здесь будет описание комплектации, схемы подключения и варианты исполнения.',
  },
  {
    id: 900005,
    name: 'V05 | Узел с подготовкой под умный дом',
    slug: 'v05-smart',
    sku: 'V05',
    price: 17000,
    old_price: null,
    currency: 'RUB',
    category_id: null,
    stock_quantity: 99,
    is_active: true,
    is_featured: false,
    short_description: 'Места под датчики протечки, сервоприводы, кабель-каналы. Сборка на клипсах.',
    main_image: null,
    description:
      'Демо‑карточка для каталога “Узел ввода”. Здесь будет описание комплектации, схемы подключения и варианты исполнения.',
  },
  {
    id: 900006,
    name: 'V06 | Премиальная отделка',
    slug: 'v06-premium',
    sku: 'V06',
    price: 19000,
    old_price: null,
    currency: 'RUB',
    category_id: null,
    stock_quantity: 99,
    is_active: true,
    is_featured: false,
    short_description: 'Закрытый фасад, скрытые крепления, порошковая окраска. Минимум визуального шума.',
    main_image: null,
    description:
      'Демо‑карточка для каталога “Узел ввода”. Здесь будет описание комплектации, схемы подключения и варианты исполнения.',
  },
]

export function getFallbackProductBySlug(slug: string): Product | null {
  return fallbackProducts.find((p) => p.slug === slug) || null
}




