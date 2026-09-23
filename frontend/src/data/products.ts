import type { Product } from "../types/product";

export const products: Product[] = [
  {
    id: 515291,
    name: "Автоматический выключатель DRX250 MT 3P 160А 18kA",
    article: "200300285",
    brand: "Legrand",
    category: "Автоматика",
    price: 64920,
    quantity: 23,
    image: null,
    description:
      "Автоматический выключатель для распределительных электрических сетей.",
    stores: [
      {
        id: 1,
        name: "Астана",
        quantity: 8,
      },
      {
        id: 2,
        name: "Алматы",
        quantity: 5,
      },
      {
        id: 3,
        name: "Шымкент",
        quantity: 3,
      },
    ],
    properties: {
      Полюсов: "3",
      Напряжение: "400 В",
      "Отключающая способность": "18 кА",
    },
  },

  {
    id: 100002,
    name: "Автоматический выключатель 3P 125А",
    article: "AUTO-125-3P",
    brand: "Legrand",
    category: "Автоматика",
    price: 54700,
    quantity: 14,
    image: null,
    properties: {
      Полюсов: "3",
      "Номинальный ток": "125 А",
      Напряжение: "400 В",
    },
  },

  {
    id: 100003,
    name: "Силовой кабель ВВГнг-LS 3×2.5",
    article: "CABLE-VVG-325",
    brand: "EKT",
    category: "Кабель и провод",
    price: 890,
    quantity: 320,
    image: null,
    properties: {
      Сечение: "3×2.5 мм²",
      Тип: "ВВГнг-LS",
    },
  },

  {
    id: 100004,
    name: "Розетка с заземлением IP44",
    article: "SOCKET-IP44",
    brand: "Legrand",
    category: "Розетки и выключатели",
    price: 4290,
    quantity: 46,
    image: null,
    properties: {
      Защита: "IP44",
      Заземление: "Да",
    },
  },

  {
    id: 100005,
    name: "LED светильник промышленный 50W",
    article: "LED-IND-50",
    brand: "EKT",
    category: "Освещение",
    price: 18900,
    quantity: 31,
    image: null,
    properties: {
      Мощность: "50 Вт",
      Тип: "LED",
    },
  },

  {
    id: 100006,
    name: "Контактор модульный 40A 230V",
    article: "CONT-40-230",
    brand: "Schneider Electric",
    category: "Автоматика",
    price: 23500,
    quantity: 0,
    image: null,
    properties: {
      Ток: "40 А",
      "Напряжение катушки": "230 В",
    },
  },
];