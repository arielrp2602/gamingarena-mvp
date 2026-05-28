import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding GamingArena...');

  // ── Juegos base ──────────────────────────────────────────────────────────

  const ygo = await prisma.juego.upsert({
    where: { nombre: 'Yu-Gi-Oh!' },
    update: {},
    create: { nombre: 'Yu-Gi-Oh!', tipo: 'TCG', iconoUrl: '/icons/yugioh.svg' },
  });

  const magic = await prisma.juego.upsert({
    where: { nombre: 'Magic: The Gathering' },
    update: {},
    create: { nombre: 'Magic: The Gathering', tipo: 'TCG', iconoUrl: '/icons/magic.svg' },
  });

  const pokemon = await prisma.juego.upsert({
    where: { nombre: 'Pokémon TCG' },
    update: {},
    create: { nombre: 'Pokémon TCG', tipo: 'TCG', iconoUrl: '/icons/pokemon.svg' },
  });

  const smash = await prisma.juego.upsert({
    where: { nombre: 'Super Smash Bros. Ultimate' },
    update: {},
    create: { nombre: 'Super Smash Bros. Ultimate', tipo: 'VIDEOJUEGO', iconoUrl: '/icons/smash.svg' },
  });

  const valorant = await prisma.juego.upsert({
    where: { nombre: 'Valorant' },
    update: {},
    create: { nombre: 'Valorant', tipo: 'VIDEOJUEGO', iconoUrl: '/icons/valorant.svg' },
  });

  const fifa = await prisma.juego.upsert({
    where: { nombre: 'EA FC 25' },
    update: {},
    create: { nombre: 'EA FC 25', tipo: 'VIDEOJUEGO', iconoUrl: '/icons/fc25.svg' },
  });

  console.log('✓ Juegos creados');

  // ── Formatos por juego ───────────────────────────────────────────────────

  const formatosYgo = [
    { nombre: 'Advanced Format', descripcion: 'Formato principal oficial' },
    { nombre: 'Speed Duel', descripcion: 'Formato compacto 4000 LP' },
    { nombre: 'Edison Format', descripcion: 'Banlist de Marzo 2010' },
    { nombre: 'Goat Format', descripcion: 'Banlist de Julio 2005' },
    { nombre: 'Draft', descripcion: 'Cada jugador arma el deck del sobre' },
  ];

  const formatosMagic = [
    { nombre: 'Standard', descripcion: 'Últimas dos temporadas de sets' },
    { nombre: 'Modern', descripcion: 'Sets desde 2003 con banlist' },
    { nombre: 'Legacy', descripcion: 'Casi todo el cardpool' },
    { nombre: 'Commander', descripcion: 'Formato social de 100 cartas' },
    { nombre: 'Draft', descripcion: 'Se arma el deck en el evento' },
  ];

  const formatosPokemon = [
    { nombre: 'Standard', descripcion: 'Sets de los últimos 2 años' },
    { nombre: 'Expanded', descripcion: 'Sets desde Black & White en adelante' },
    { nombre: 'Unlimited', descripcion: 'Todo el cardpool sin restricciones' },
  ];

  const formatosSmash = [
    { nombre: 'Competitivo (3 stocks)', descripcion: '3 vidas, sin objetos, escenarios legales' },
    { nombre: 'Casual', descripcion: 'Config abierta, con objetos, cualquier escenario' },
  ];

  const formatosValorant = [
    { nombre: 'Competitivo', descripcion: 'Mejor de 3 mapas, sin restricciones de agente' },
    { nombre: 'Spike Rush', descripcion: 'Rondas cortas con powerups' },
  ];

  const formatosFifa = [
    { nombre: 'H2H Competitivo', descripcion: 'Head to Head, equipos de clubes' },
    { nombre: 'Ultimate Team', descripcion: 'Partidos con equipos creados en FUT' },
  ];

  for (const [juego, formatos] of [
    [ygo, formatosYgo],
    [magic, formatosMagic],
    [pokemon, formatosPokemon],
    [smash, formatosSmash],
    [valorant, formatosValorant],
    [fifa, formatosFifa],
  ] as const) {
    for (const fmt of formatos) {
      await prisma.formatoJuego.upsert({
        where: { juegoId_nombre: { juegoId: juego.id, nombre: fmt.nombre } },
        update: {},
        create: { juegoId: juego.id, nombre: fmt.nombre, descripcion: fmt.descripcion },
      });
    }
  }

  console.log('✓ Formatos creados');

  // ── Personajes (Smash Bros) ──────────────────────────────────────────────

  const smashPersonajes = [
    'Mario', 'Donkey Kong', 'Link', 'Samus', 'Kirby', 'Fox', 'Pikachu',
    'Marth', 'Mewtwo', 'Roy', 'Mr. Game & Watch', 'Meta Knight', 'Pit',
    'Olimar', 'Lucario', 'Ness', 'Captain Falcon', 'Jigglypuff',
    'Inkling', 'Isabelle', 'Joker', 'Hero', 'Byleth', 'Kazuya', 'Sora',
  ];

  for (const nombre of smashPersonajes) {
    await prisma.personaje.upsert({
      where: { juegoId_nombre: { juegoId: smash.id, nombre } },
      update: {},
      create: { juegoId: smash.id, nombre },
    });
  }

  console.log('✓ Personajes (Smash) creados');

  // ── Admin por defecto ────────────────────────────────────────────────────

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@gamingarena.app';
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD ?? 'Admin1234!',
    10,
  );

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      roles: [Role.ADMIN],
      activeRole: Role.ADMIN,
      emailVerified: true,
      onboardingDone: true,
    },
  });

  console.log(`✓ Admin creado: ${adminEmail}`);
  console.log('🎉 Seed completo');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
