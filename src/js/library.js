// Biblioteca de Spotify de JinfaX — snapshot estático (sin API en tiempo real → carga instantánea).
// Para actualizar: editar este archivo y volver a publicar.

const A = (h) => ({ s: `https://i.scdn.co/image/ab67616d00001e02${h}`, l: `https://i.scdn.co/image/ab67616d0000b273${h}` });
const P = (h) => ({ s: `https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84${h}`, l: `https://image-cdn-ak.spotifycdn.com/image/ab67706c0000bebb${h}` });
const M = (...hs) => ({
  s: `https://mosaic.scdn.co/300/${hs.map((h) => `ab67616d00001e02${h}`).join('')}`,
  l: `https://mosaic.scdn.co/640/${hs.map((h) => `ab67616d0000b273${h}`).join('')}`,
});
const pv = (h) => (h ? `https://p.scdn.co/mp3-preview/${h}` : null);

export const MOODS = [
  { id: 'all', label: 'Todo' },
  { id: 'fiesta', label: 'Fiesta' },
  { id: 'clasicos', label: 'Clásicos & rock' },
  { id: 'sentir', label: 'Sentimientos' },
  { id: 'viaje', label: 'Viaje' },
  { id: 'otros', label: 'Archivo' },
];

export const PLAYLISTS = [
  { id: '3KjrfDd2HlH7y7b3e8AJ3m', name: 'INVICTUS', mood: 'otros', featured: true, cover: A('97aaceb7a720430f7f963cd2'), preview: pv('3d2a9db71a6913474d878417640d222cbf905bf3') },
  { id: '5T126dtUMnYAG0BuUH7Q7d', name: 'Liberty Life 🥵🩸', mood: 'fiesta', desc: 'Carpe Diem your party', cover: P('10f8f0179ea9babc865b8fe2'), preview: pv('ab53c88f5e29e6cb9279f5d66d1060dd14b92959') },
  { id: '3Elp2mMyaIehDlcW9riGFY', name: 'Prime', mood: 'fiesta', cover: P('b00554bcb1aea72f655ced5e'), preview: pv('82bd1771d0c3fb464cb25572b4f392f0b0a8b977') },
  { id: '25XxYDdAeKtNNa4sCm2Bye', name: 'Sex-Appeal 🔥', mood: 'fiesta', desc: 'Just let you enjoy it', cover: P('fb25d8ae7705747a8b826ae5'), preview: pv('9d6e88bf47da546a93b7f90231f4f6d7aca001fb') },
  { id: '5KZQ4DEXKqSuhfgnecy6RU', name: 'Beach bitch', mood: 'fiesta', cover: M('0320feb23e4090969b931fac', 'd4549c0e601fbe7e8622a2f5', 'e88a017e11d2dc06ff391761', 'f73748d9d869ff756993cfde'), preview: pv('47f902acad5dcd54b586e43b19d778e272f737b1') },
  { id: '7899bgX72CXYmj2e3461mQ', name: 'Queen', mood: 'clasicos', desc: 'recordando a quienes marcaron una época', cover: P('12216d80fbd9ba0da288191b'), preview: null },
  { id: '346byvl6RbaqRVEw1Yld5S', name: 'Soda experience', mood: 'clasicos', cover: M('1f400a1f4d821b00824cf58f', 'c451ed28353639e79b4d97d9', 'df54506fd365623237335f21', 'e28947f6ad2f100af9c1965a'), preview: pv('b784c2a614e38c39194c5e95b5cf36475ae8c8dd') },
  { id: '5krq45CLSzoX0YfHAeHyFr', name: 'Dream guitar', mood: 'clasicos', cover: A('3f6dc5b3d42736bc91068d7b'), preview: pv('935ce324d37d418c644a7dc4c4cb5fc1660e3c81') },
  { id: '1lJyWohnmiyQsBdHBAwpaP', name: 'The Senseless Things', mood: 'clasicos', cover: M('4a6f5598c41e77ae78cab725', 'a7292b6863258e889b78d787', 'e28947f6ad2f100af9c1965a', 'ec548c00d3ac2f10be73366d'), preview: pv('d4e3185b10614eb49c19e1a40359df2187955510') },
  { id: '2EHR4tGrhCrxfy6jhFIw9R', name: 'Calm My Dear Lady', mood: 'sentir', cover: M('31b48da018d92c7b84ec3de7', '5c6d7e34db4bead9c9dfeb42', 'a6e54d447ec1e9f2375f42ee', 'd8dfb1a98b1d2790cae2213c'), preview: pv('2dcc311942b67ddd846088126dffdaf9433d14a7') },
  { id: '3eLtznkV9y97T6zMiK1sYT', name: '🫵my dear person', mood: 'sentir', cover: A('bd7f3ebf0ca4a42ec4718b4e'), preview: pv('e0f860b11cd448dd5217c104ac6a696cd2a0bc17') },
  { id: '2IHWpieh3qWv7vyPMeDaxT', name: 'There nothing that I can do', mood: 'sentir', cover: P('82a5540b7de0f55e03c1d030'), preview: pv('161ef474ecf74508ac4a307e3d577e5cd61aa4a6') },
  { id: '2fmHpyErA0ocuGWOmFZNkE', name: 'I surpassed you too', mood: 'sentir', cover: M('062fd03d7ef8ad5f773b89e7', 'a4e6eac83c0fe38bf682f643', 'c13ab45ff17ebf5d8a5e854b', 'd8fb6589dfe54aff720a00c4'), preview: pv('b6ee0b75f0972616e457d55e2ca044353891c4d9') },
  { id: '3WctAGzpAWJS7CToQuBGao', name: 'New Me girl, you like it?', mood: 'sentir', desc: 'Reminder', cover: P('4561535441c640d959df7d96'), preview: pv('98af5b6b77831ad55b6d1129148745705a311973') },
  { id: '5RXgXBScgL2OhpM3f2xQI9', name: 'Xs girl', mood: 'sentir', cover: A('21d546b7511792c3aa5b7eee'), preview: pv('422245c4b555d5105bc47124bd43f67c1e65d8ce') },
  { id: '24DyRHIb6LJlwdCfyhuQKG', name: "Enjoyful's Travel", mood: 'viaje', desc: 'go to your destiny', cover: P('65553f587a35d83dda4e2e27'), preview: pv('08df96b9536f855e703d8503770a348387b65025') },
  { id: '61La4BoVurLeXCeapyZg1g', name: '?', mood: 'otros', cover: P('11a1d2bb7d14985956ae86cf'), preview: pv('12ae7f061a9da14a7c1e6a3e21de68365697efe8') },
  { id: '0puHvb87SvlGlkce4jFesW', name: 'My Shazam Tracks', mood: 'otros', cover: M('02df2d642b572cf4f284a5c3', '5054a99f9ce5b356db8d5852', 'c67cc9596a3252490933e2f9', 'c83ce18aaa3c0d32c3011b13'), preview: pv('419c869f716f9eeaec749c398830dc6e01d6ebaf') },
  { id: '42G19P5NObMYysd7V2Ru7x', name: "Child Vice 'ty", mood: 'otros', cover: null, preview: pv('124251187a10ed1b6ea7e2b28fdd3638c434118b') },
  { id: '7A9fqNEvvSTXrYh7Sfyay2', name: 'My Playlist #37', mood: 'otros', cover: null, preview: null },
];

const ART = (h) => `https://i.scdn.co/image/ab67616100005174${h}`;
export const ARTISTS = [
  { id: '3fMbdgg4jU18AjLCKBhRSm', name: 'Michael Jackson', img: ART('997cc9a4aec335d46c9481fd'), saved: true },
  { id: '7An4yvF7hDYDolN4m5zKBp', name: 'Soda Stereo', img: ART('7c0578274e203f069f5f411c') },
  { id: '2mLA48B366zkELXYx7hcDN', name: 'Peggy Gou', img: ART('ffbd43b1e54eb09a8c824f53') },
  { id: '0elWFr7TW8piilVRYJUe4P', name: 'Natanael Cano', img: ART('0d4838ef7ef6c0f889266f60') },
  { id: '3vQ0GE3mI0dAaxIMYe5g7z', name: 'Paulo Londra', img: ART('066833df1c8b20362274c3e5') },
  { id: '1Xyo4u8uXC1ZmMpatF05PJ', name: 'The Weeknd', img: ART('c1719ac9e6a75c1c25835018') },
  { id: '6olE6TJLqED3rqDCT0FyPh', name: 'Nirvana', img: 'https://i.scdn.co/image/42ae0f180f16e2f21c1f2212717fc436f5b95451' },
  { id: '3qm84nBOXUEQ2vnTfUTTFC', name: "Guns N' Roses", img: ART('50defaf9fc059a1efc541f4c') },
  { id: '27T030eWyCQRmDyuvr1kxY', name: 'Scorpions', img: ART('7440170c0628c2945da819c3') },
  { id: '0xliTEbFfy5HQHvsTknTkX', name: 'Alphaville', img: ART('3f8779bb1c97be855c6b51a8') },
  { id: '2QsynagSdAqZj3U9HgDzjD', name: 'Bob Marley', img: 'https://i.scdn.co/image/02fd758d9805ef44d1caafc35ff17a47f9dff098' },
  { id: '7Gi6gjaWy3DxyilpF1a8Is', name: 'Junior H', img: ART('5fbe9b7dc7d9a2295bd6022c') },
  { id: '1vyhD5VmyZ7KMfW5gqLgo5', name: 'J Balvin', img: ART('0405b03342c2e56751b9923d') },
  { id: '1r4hJ1h58CWwUQe3MxPuau', name: 'Maluma', img: ART('1b0d196ca84f4a0d076b4570') },
  { id: '7CajNmpbOovFoOoasH2HaY', name: 'Calvin Harris', img: ART('8ebba5e60113b48de8c11f6b') },
  { id: '0TnOYISbd1XYRBk9myaseg', name: 'Pitbull', img: ART('e75db75543a89589514259b2') },
  { id: '04gDigrS5kc9YWfZHwBETP', name: 'Maroon 5', img: ART('f8349dfb619a7f842242de77') },
  { id: '1yxSLGMDHlW21z4YXirZDS', name: 'Black Eyed Peas', img: ART('f2200ce505d25e1d7e1561be') },
  { id: '5pKCCKE2ajJHZ9KAiaK11H', name: 'Rihanna', img: ART('cb565a8e684e3be458d329ac') },
  { id: '3jc496ljiyrS3ECrD7QiqL', name: 'Gipsy Kings', img: ART('0021ec9649c85befdf9cc4a9') },
];

export const PROFILE_URL = 'https://open.spotify.com/user/31gklt2b5hemwskot6hznydvma3q';
