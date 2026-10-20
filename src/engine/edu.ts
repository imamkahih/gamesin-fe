// Konten kepramukaan: SKU tingkatan pertama tiap golongan + 3 SKK (MVP).
// CATATAN: butir di sini adalah draf latihan, BUKAN daftar resmi. Daftar butir SKU/SKK harus
// dicocokkan dengan SK/Panduan Kwarnas terbaru dan direview Binamuda/Pusdiklatnas sebelum rilis.
// Game tidak menggantikan pengujian: status tertinggi yang bisa dicapai di game adalah "siap_uji".

import type { Golongan } from './config';

export type EduType = 'quiz' | 'game' | 'real';
export type EduStatus = 'belum' | 'latihan' | 'siap_uji' | 'disahkan';

export interface QuizQ {
  q: string;
  options: string[];
  a: number;
}

// Kondisi "praktik di game" dibaca dari state pemain (dievaluasi di server).
export interface EduCondition {
  label: string;
  stat: 'bank' | 'harvested' | 'cropKinds' | 'depositDays' | 'ownsVehicle' | 'watered' | 'daysPlayed' | 'sold';
  n: number;
  vehicle?: string;
}

export interface EduItem {
  id: string;
  no: number;
  title: string;
  desc: string;
  type: EduType;
  quiz?: QuizQ[];
  cond?: EduCondition;
}

export interface EduModule {
  id: string;
  kind: 'sku' | 'skk';
  name: string;
  golongan: Golongan[];
  color?: string;
  items: EduItem[];
}

const PANCASILA: QuizQ[] = [
  { q: 'Sila pertama Pancasila adalah…', options: ['Persatuan Indonesia', 'Ketuhanan Yang Maha Esa', 'Keadilan sosial bagi seluruh rakyat Indonesia'], a: 1 },
  { q: 'Sila ketiga Pancasila adalah…', options: ['Persatuan Indonesia', 'Kemanusiaan yang adil dan beradab', 'Ketuhanan Yang Maha Esa'], a: 0 },
  { q: 'Pancasila terdiri dari berapa sila?', options: ['4', '5', '10'], a: 1 },
];

const SEJARAH: QuizQ[] = [
  { q: 'Hari Pramuka diperingati setiap tanggal…', options: ['17 Agustus', '14 Agustus', '28 Oktober'], a: 1 },
  { q: 'Bapak Pramuka Indonesia adalah…', options: ['Sri Sultan Hamengkubuwono IX', 'Ki Hajar Dewantara', 'Bung Tomo'], a: 0 },
  { q: 'Pendiri gerakan kepanduan dunia adalah…', options: ['Robert Baden-Powell', 'Thomas Edison', 'Isaac Newton'], a: 0 },
];

const DASA_DARMA: QuizQ[] = [
  { q: 'Darma ke-1 Dasa Darma: Takwa kepada…', options: ['Orang tua', 'Tuhan Yang Maha Esa', 'Negara'], a: 1 },
  { q: '"Hemat, cermat dan bersahaja" adalah darma ke…', options: ['6', '8', '10'], a: 1 },
  { q: 'Darma ke-2: Cinta alam dan…', options: ['kasih sayang sesama manusia', 'rajin belajar', 'patuh pada aturan'], a: 0 },
  { q: 'Darma ke-10 Dasa Darma adalah…', options: ['Rela menolong dan tabah', 'Suci dalam pikiran, perkataan dan perbuatan', 'Disiplin, berani dan setia'], a: 1 },
];

const ARAH: QuizQ[] = [
  { q: 'Matahari terbit dari arah…', options: ['Barat', 'Timur', 'Utara'], a: 1 },
  { q: 'Lawan arah Utara adalah…', options: ['Selatan', 'Timur', 'Barat'], a: 0 },
  { q: 'Arah di antara Utara dan Timur disebut…', options: ['Barat Laut', 'Timur Laut', 'Tenggara'], a: 1 },
];

export const EDU_MODULES: EduModule[] = [
  {
    id: 'sku_siaga_mula',
    kind: 'sku',
    name: 'SKU Siaga Mula',
    golongan: ['siaga'],
    items: [
      {
        id: 'sm_dwisatya', no: 1, title: 'Dwi Satya & Dwi Darma', desc: 'Kenali janji dan ketentuan moral Pramuka Siaga.', type: 'quiz',
        quiz: [
          { q: 'Janji Pramuka Siaga disebut…', options: ['Dwi Satya', 'Tri Satya', 'Dasa Darma'], a: 0 },
          { q: 'Dwi Darma: Siaga itu menurut ayah dan…', options: ['ibundanya', 'kakaknya', 'gurunya'], a: 0 },
          { q: 'Dwi Darma: Siaga itu berani dan…', options: ['tidak putus asa', 'selalu menang', 'paling kuat'], a: 0 },
        ],
      },
      { id: 'sm_pancasila', no: 2, title: 'Mengenal Pancasila', desc: 'Sebutkan sila-sila Pancasila.', type: 'quiz', quiz: PANCASILA },
      { id: 'sm_rawat', no: 3, title: 'Rajin merawat tanaman', desc: 'Siram 30 petak tanaman di kebunmu.', type: 'game', cond: { label: 'Siram 30 petak', stat: 'watered', n: 30 } },
      { id: 'sm_menabung', no: 4, title: 'Belajar menabung', desc: 'Punya tabungan 500 di bank.', type: 'game', cond: { label: 'Saldo bank ≥ 500', stat: 'bank', n: 500 } },
      { id: 'sm_rumah', no: 5, title: 'Membantu di rumah', desc: 'Bantu ayah/ibu membereskan tempat tidur selama seminggu. Kakak Pembina akan mengujinya.', type: 'real' },
    ],
  },
  {
    id: 'sku_penggalang_ramu',
    kind: 'sku',
    name: 'SKU Penggalang Ramu',
    golongan: ['penggalang', 'umum', 'dewasa'],
    items: [
      { id: 'pr_pancasila', no: 1, title: 'Pancasila', desc: 'Hafal dan pahami sila-sila Pancasila.', type: 'quiz', quiz: PANCASILA },
      { id: 'pr_dasadarma', no: 2, title: 'Tri Satya & Dasa Darma', desc: 'Pahami Dasa Darma Pramuka.', type: 'quiz', quiz: DASA_DARMA },
      { id: 'pr_sejarah', no: 3, title: 'Sejarah Gerakan Pramuka', desc: 'Kenali sejarah kepanduan.', type: 'quiz', quiz: SEJARAH },
      { id: 'pr_arah', no: 4, title: 'Arah mata angin', desc: 'Kenali 8 arah mata angin.', type: 'quiz', quiz: ARAH },
      { id: 'pr_hemat', no: 5, title: 'Hemat dan cermat', desc: 'Menabung di bank pada 3 hari berbeda.', type: 'game', cond: { label: 'Setor di 3 hari berbeda', stat: 'depositDays', n: 3 } },
      { id: 'pr_simpul', no: 6, title: 'Tali-temali', desc: 'Praktikkan simpul mati, simpul hidup, dan simpul pangkal. Diuji Kakak Pembina.', type: 'real' },
    ],
  },
  {
    id: 'sku_penegak_bantara',
    kind: 'sku',
    name: 'SKU Penegak Bantara',
    golongan: ['penegak'],
    items: [
      { id: 'pb_dasadarma', no: 1, title: 'Dasa Darma', desc: 'Pahami dan amalkan Dasa Darma.', type: 'quiz', quiz: DASA_DARMA },
      { id: 'pb_sejarah', no: 2, title: 'Sejarah kepanduan', desc: 'Kenali sejarah Gerakan Pramuka.', type: 'quiz', quiz: SEJARAH },
      { id: 'pb_usaha', no: 3, title: 'Kewirausahaan tani', desc: 'Jual 100 hasil panen ke pengepul.', type: 'game', cond: { label: 'Jual 100 hasil panen', stat: 'sold', n: 100 } },
      { id: 'pb_tabung', no: 4, title: 'Mengelola keuangan', desc: 'Kumpulkan saldo bank 5.000.', type: 'game', cond: { label: 'Saldo bank ≥ 5.000', stat: 'bank', n: 5000 } },
      { id: 'pb_bakti', no: 5, title: 'Bakti masyarakat', desc: 'Ikut kegiatan kerja bakti di lingkunganmu. Diuji Kakak Pembina.', type: 'real' },
    ],
  },
  {
    id: 'sku_pandega',
    kind: 'sku',
    name: 'SKU Pandega',
    golongan: ['pandega'],
    items: [
      { id: 'pd_dasadarma', no: 1, title: 'Dasa Darma', desc: 'Pahami Dasa Darma sebagai pedoman.', type: 'quiz', quiz: DASA_DARMA },
      { id: 'pd_usaha', no: 2, title: 'Usaha mandiri', desc: 'Kumpulkan saldo bank 20.000 dari usaha tani.', type: 'game', cond: { label: 'Saldo bank ≥ 20.000', stat: 'bank', n: 20000 } },
      { id: 'pd_konsisten', no: 3, title: 'Konsisten berkarya', desc: 'Bertani selama 14 hari game.', type: 'game', cond: { label: 'Main 14 hari game', stat: 'daysPlayed', n: 14 } },
      { id: 'pd_abdi', no: 4, title: 'Pengabdian masyarakat', desc: 'Rancang dan laksanakan satu proyek pengabdian. Diuji Kakak Pembina.', type: 'real' },
    ],
  },
  {
    id: 'skk_penabung',
    kind: 'skk',
    name: 'SKK Penabung',
    golongan: ['siaga', 'penggalang', 'penegak', 'pandega', 'dewasa', 'umum'],
    color: '#e8c34a',
    items: [
      {
        id: 'kp_bank', no: 1, title: 'Mengenal bank', desc: 'Pahami fungsi bank dan bunga.', type: 'quiz',
        quiz: [
          { q: 'Bunga tabungan adalah…', options: ['Biaya yang kita bayar ke bank', 'Imbalan dari bank atas uang yang kita simpan', 'Hadiah undian'], a: 1 },
          { q: 'Mengapa menyimpan uang di bank lebih aman?', options: ['Tidak bisa hilang dicopet', 'Bisa dipakai belanja di mana saja', 'Uangnya jadi dua kali lipat'], a: 0 },
        ],
      },
      { id: 'kp_rutin', no: 2, title: 'Menabung rutin', desc: 'Setor ke bank pada 7 hari berbeda.', type: 'game', cond: { label: 'Setor di 7 hari berbeda', stat: 'depositDays', n: 7 } },
      { id: 'kp_target', no: 3, title: 'Mencapai target', desc: 'Kumpulkan saldo bank 3.000.', type: 'game', cond: { label: 'Saldo bank ≥ 3.000', stat: 'bank', n: 3000 } },
      { id: 'kp_nyata', no: 4, title: 'Buku tabungan nyata', desc: 'Tunjukkan buku tabungan/celengan pribadimu ke Kakak Pembina.', type: 'real' },
    ],
  },
  {
    id: 'skk_tanaman',
    kind: 'skk',
    name: 'SKK Pengumpul Tanaman Hidup',
    golongan: ['siaga', 'penggalang', 'penegak', 'pandega', 'dewasa', 'umum'],
    color: '#3fa34d',
    items: [
      {
        id: 'kt_bagian', no: 1, title: 'Bagian tanaman', desc: 'Kenali bagian-bagian tanaman.', type: 'quiz',
        quiz: [
          { q: 'Bagian tanaman yang menyerap air dari tanah adalah…', options: ['Daun', 'Akar', 'Bunga'], a: 1 },
          { q: 'Proses tanaman membuat makanan dengan bantuan cahaya matahari disebut…', options: ['Fotosintesis', 'Respirasi', 'Penyerbukan'], a: 0 },
          { q: 'Padi cocok ditanam pada musim…', options: ['Hujan', 'Kemarau'], a: 0 },
        ],
      },
      { id: 'kt_koleksi', no: 2, title: 'Koleksi jenis tanaman', desc: 'Panen 5 jenis tanaman berbeda.', type: 'game', cond: { label: '5 jenis tanaman dipanen', stat: 'cropKinds', n: 5 } },
      { id: 'kt_rawat', no: 3, title: 'Merawat tanaman', desc: 'Panen 50 hasil bumi.', type: 'game', cond: { label: 'Panen 50 hasil', stat: 'harvested', n: 50 } },
      { id: 'kt_nyata', no: 4, title: 'Kebun nyata', desc: 'Rawat minimal 5 tanaman hidup dalam pot di rumah. Diuji Kakak Pembina.', type: 'real' },
    ],
  },
  {
    id: 'skk_sepeda',
    kind: 'skk',
    name: 'SKK Pengendara Sepeda',
    golongan: ['siaga', 'penggalang', 'penegak', 'pandega', 'dewasa', 'umum'],
    color: '#3fa34d',
    items: [
      { id: 'ks_punya', no: 1, title: 'Punya sepeda', desc: 'Beli sepeda di bengkel.', type: 'game', cond: { label: 'Memiliki sepeda', stat: 'ownsVehicle', n: 1, vehicle: 'sepeda' } },
      {
        id: 'ks_rambu', no: 2, title: 'Rambu lalu lintas', desc: 'Kenali rambu dan aturan bersepeda.', type: 'quiz',
        quiz: [
          { q: 'Rambu berbentuk segi delapan berwarna merah artinya…', options: ['Stop / berhenti', 'Boleh parkir', 'Jalan licin'], a: 0 },
          { q: 'Saat bersepeda di Indonesia, kita berjalan di lajur…', options: ['Kiri', 'Kanan', 'Tengah'], a: 0 },
          { q: 'Lampu lalu lintas kuning artinya…', options: ['Percepat laju', 'Hati-hati / bersiap berhenti', 'Boleh jalan'], a: 1 },
        ],
      },
      {
        id: 'ks_rawat', no: 3, title: 'Merawat sepeda', desc: 'Pahami perawatan dasar sepeda.', type: 'quiz',
        quiz: [
          { q: 'Rantai sepeda sebaiknya diberi…', options: ['Pelumas/oli', 'Air sabun setiap hari', 'Lem'], a: 0 },
          { q: 'Sebelum bersepeda, periksa terlebih dahulu…', options: ['Rem dan tekanan ban', 'Warna cat', 'Bel saja'], a: 0 },
        ],
      },
      { id: 'ks_nyata', no: 4, title: 'Praktik bersepeda', desc: 'Bersepeda dengan aman sejauh 5 km didampingi Pembina. Diuji Kakak Pembina.', type: 'real' },
    ],
  },
];

export const EDU_ITEMS: Record<string, EduItem & { module: string }> = {};
for (const m of EDU_MODULES) for (const it of m.items) EDU_ITEMS[it.id] = { ...it, module: m.id };

export const EDU_REWARD_BANK = 50;
export const GOLONGAN_NAME: Record<Golongan, string> = {
  siaga: 'Siaga', penggalang: 'Penggalang', penegak: 'Penegak', pandega: 'Pandega', dewasa: 'Pembina / Dewasa', umum: 'Umum',
};

export function modulesFor(g: Golongan): EduModule[] {
  return EDU_MODULES.filter((m) => m.golongan.includes(g));
}
