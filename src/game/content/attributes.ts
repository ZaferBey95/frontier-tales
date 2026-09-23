import type { AttributeDef, AttributeId } from '../types';

export const ATTRIBUTE_ORDER: AttributeId[] = ['strength', 'agility', 'aim', 'charm'];

export const ATTRIBUTES: Record<AttributeId, AttributeDef> = {
  strength: {
    id: 'strength',
    name: 'Kuvvet',
    short: 'KUV',
    description: 'Ağır işlerde işe yarar ve canını artırır.',
  },
  agility: {
    id: 'agility',
    name: 'Çeviklik',
    short: 'ÇEV',
    description: 'Binicilik ve el becerisi isteyen işlerde, düelloda kurşundan kaçarken işe yarar.',
  },
  aim: {
    id: 'aim',
    name: 'Nişancılık',
    short: 'NİŞ',
    description: 'Avda ve düelloda isabetini ve hasarını artırır.',
  },
  charm: {
    id: 'charm',
    name: 'Karizma',
    short: 'KAR',
    description: 'İnsanlarla uğraşan işlerde işe yarar, eşyalarını daha iyi fiyata satarsın.',
  },
};
