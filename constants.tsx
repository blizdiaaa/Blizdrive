
import React from 'react';

export const THEME_OPTIONS = [
  { name: 'Dreamy Landscape', url: 'https://c4.wallpaperflare.com/wallpaper/142/751/831/landscape-anime-digital-art-fantasy-art-wallpaper-preview.jpg' },
  { name: 'Neon City', url: 'https://images.wallpaperscraft.com/image/single/street_night_neon_156434_1920x1080.jpg' },
  { name: 'Starry Sky', url: 'https://images.wallpaperscraft.com/image/single/stars_milky_way_sky_121171_1920x1080.jpg' },
  { name: 'Foggy Forest', url: 'https://images.wallpaperscraft.com/image/single/forest_fog_trees_118432_1920x1080.jpg' }
];

export const INITIAL_DATA: any = {
  items: {
    'root-1': {
      id: 'root-1',
      parentId: null,
      name: 'Academic Resources',
      type: 'folder',
      icon: '#8b5cf6',
      children: ['page-1', 'pdf-1'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    'page-1': {
      id: 'page-1',
      parentId: 'root-1',
      name: 'Semester Plan',
      type: 'page',
      content: [
        { id: 'b1', type: 'heading', content: 'Spring 2024 Goals' },
        { id: 'b2', type: 'text', content: 'Focus on advanced algorithms and digital design.' },
        { id: 'b3', type: 'checklist', content: 'Complete Project Alpha', checked: false },
        { id: 'b4', type: 'checklist', content: 'Submit Ethics Paper', checked: true },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    'pdf-1': {
      id: 'pdf-1',
      parentId: 'root-1',
      name: 'Advanced Calculus Syllabus.pdf',
      type: 'pdf',
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    'root-2': {
      id: 'root-2',
      parentId: null,
      name: 'Personal Projects',
      type: 'folder',
      icon: '#06b6d4',
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  },
  tabs: [
    { id: 'tab-1', name: 'Semester 1', rootItems: ['root-1', 'root-2'] }
  ],
  activeTabId: 'tab-1',
  activeItemId: 'page-1',
  settings: {
    background: THEME_OPTIONS[0].url,
    accentColor: '#8b5cf6',
    userName: 'Blizdia',
    workspaceName: 'Ethereal'
  }
};
