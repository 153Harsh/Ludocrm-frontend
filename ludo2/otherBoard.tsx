import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dimensions,
  Image,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, authHeaders } from '../api';

import { useAuth } from '../auth/AuthContext';

const { width: W } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;
const BOARD_SIZE = W;
const SOURCE_BOARD_WIDTH = 1803;
const SOURCE_BOARD_HEIGHT = 1799;
const SOURCE_GRID_BOUNDS = { left: 57, top: 48, width: 1696, height: 1702 };
const GRID_LEFT = (SOURCE_GRID_BOUNDS.left / SOURCE_BOARD_WIDTH) * BOARD_SIZE;
const GRID_TOP = (SOURCE_GRID_BOUNDS.top / SOURCE_BOARD_HEIGHT) * BOARD_SIZE;
const GRID_WIDTH = (SOURCE_GRID_BOUNDS.width / SOURCE_BOARD_WIDTH) * BOARD_SIZE;
const GRID_HEIGHT =
  (SOURCE_GRID_BOUNDS.height / SOURCE_BOARD_HEIGHT) * BOARD_SIZE;
const TILE_W = GRID_WIDTH / 15;
const TILE_H = GRID_HEIGHT / 15;
const PAWN_SIZE = Math.min(TILE_W, TILE_H) * 0.9;
const PAWN_TIP = PAWN_SIZE * 0.86;
const TEAM_CARD_WIDTH = BOARD_SIZE * 0.31;
const TEAM_CARD_HEIGHT = BOARD_SIZE * 0.285;

const AREA_TRACK: Record<number, Array<[number, number]>> = {
  // area 1 (blue) – bottom-left quadrant track cells 1-18
  1: [
    [8, 9],
    [8, 10],
    [8, 11],
    [8, 12],
    [8, 13],
    [8, 14], // cells 1-6
    [7, 14],
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9], // cells 7-12 (home col)
    [6, 14],
    [6, 13], // cells 13-14 (start)
    [6, 12],
    [6, 11],
    [6, 10],
    [6, 9], // cells 15-18
  ],
  // area 2 (red) – top-left
  2: [
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
    [0, 7],
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 6],
    [5, 6],
  ],
  // area 3 (green) – top-right
  3: [
    [6, 5],
    [6, 4],
    [6, 3],
    [6, 2],
    [6, 1],
    [6, 0],
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
  ],
  // area 4 (yellow) – bottom-right
  4: [
    [9, 6],
    [10, 6],
    [11, 6],
    [12, 6],
    [13, 6],
    [14, 6],
    [14, 7],
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [14, 8],
    [13, 8],
    [12, 8],
    [11, 8],
    [10, 8],
    [9, 8],
  ],
};

// Home stretch (cells 8-12) per color
const HOME_TRACK: Record<string, Array<[number, number]>> = {
  blue: [
    [7, 14],
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],

  red: [
    [0, 7],
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],

  green: [
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],

  yellow: [
    [14, 7],
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
};

const BASE_POSITIONS: Record<string, Array<[number, number]>> = {
  blue: [
    [1.12, 11.47],
    [2.4, 10.18],
    [3.78, 11.5],
    [2.4, 12.84],
  ],
  red: [
    [1.12, 2.5],
    [2.4, 1.18],
    [3.78, 2.5],
    [2.4, 3.83],
  ],
  green: [
    [11.6, 1.2],
    [10.2, 2.5],
    [12.9, 2.5],
    [10, 2.5],
  ],
  yellow: [
    [11.4, 10.2],
    [10.2, 11.5],
    [12.8, 11.5],
    [12.1, 12.84],
  ],
};

const FINISH_POSITIONS: Record<PawnColor, [number, number]> = {
  red: [6, 7],
  green: [7, 6],
  blue: [7, 8],
  yellow: [8, 7],
};

const HOME_AREA_BY_COLOR: Record<PawnColor, number> = {
  blue: 1,
  red: 2,
  green: 3,
  yellow: 4,
};

const COLOR_BY_HOME_AREA: Record<number, PawnColor> = {
  1: 'blue',
  2: 'red',
  3: 'green',
  4: 'yellow',
};

function positionToGrid(pos: string, color: string): [number, number] | null {
  if (!pos || pos === '0') return null;

  // finished pawns
  if (pos === 'finished') {
    return FINISH_POSITIONS[color as PawnColor];
  }

  // home track
  const homeMatch = pos.match(/home-area-(\d+)-id-(\d+)/);

  if (homeMatch) {
    const homeId = Number(homeMatch[2]);

    const homeTrack = HOME_TRACK[color];

    return homeTrack?.[homeId - 1] ?? null;
  }

  // normal track
  const match = pos.match(/cell-area-(\d+)-id-(\d+)/);

  if (!match) return null;

  const areaId = Number(match[1]);
  const cellNum = Number(match[2]);

  const track = AREA_TRACK[areaId];

  if (!track) return null;

  return track[cellNum - 1] ?? null;
}

function gridToPixel(col: number, row: number) {
  return {
    left: GRID_LEFT + col * TILE_W + TILE_W / 2 - PAWN_SIZE / 2,
    top: GRID_TOP + row * TILE_H + TILE_H / 2 - PAWN_TIP,
  };
}
const renderDebugGrid = () => {
  const cells = [];

  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      cells.push(
        <View
          key={`${row}-${col}`}
          style={{
            position: 'absolute',
            left: GRID_LEFT + col * TILE_W,
            top: GRID_TOP + row * TILE_H,
            width: TILE_W,
            height: TILE_H,
            borderWidth: 1,
            borderColor: 'rgba(255,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 8,
              color: 'red',
              fontWeight: 'bold',
            }}
          >
            {col},{row}
          </Text>
        </View>,
      );
    }
  }

  return cells;
};
function homeCardPosition(color: PawnColor) {
  const centers: Record<PawnColor, [number, number]> = {
    red: [3, 3],
    green: [12, 3],
    blue: [3, 12],
    yellow: [12, 12],
  };
  const [col, row] = centers[color];

  return {
    left: GRID_LEFT + col * TILE_W - TEAM_CARD_WIDTH / 2,
    top: GRID_TOP + row * TILE_H - TEAM_CARD_HEIGHT / 2,
  };
}

// ─── types ────────────────────────────────────────────────────────────────────
type PawnColor = 'red' | 'green' | 'yellow' | 'blue';

interface Pawn {
  id: string;
  playerId: string;
  color: PawnColor;
  type: string;
  currentPosition: string;
  moves: number;
}

const normalizePawnType = (type?: string | null) =>
  String(type || '').toLowerCase();

const normalizePawnPosition = (position?: string | number | null) =>
  String(position ?? '').trim();

const isBasePawn = (pawn: Pawn) => {
  const position = normalizePawnPosition(pawn.currentPosition);

  return (
    normalizePawnType(pawn.type) === 'base' || !position || position === '0'
  );
};

const isCenterPawn = (pawn: Pawn) =>
  normalizePawnType(pawn.type) === 'center' ||
  normalizePawnPosition(pawn.currentPosition) === 'finished';

interface Player {
  playerId: string;
  playerName: string;
  color: PawnColor;
  moves: number;
  currentDiceRollBalance: number;
  home: number;
  rank?: number | null;
  winPosition?: number | null;
  teamName?: string;
}

const PAWN_IMAGES: Record<PawnColor, ReturnType<typeof require>> = {
  red: require('../assets/gameAssets/pawn-red.png'),
  green: require('../assets/gameAssets/pawn-green.png'),
  yellow: require('../assets/gameAssets/pawn-yellow.png'),
  blue: require('../assets/gameAssets/pawn-blue.png'),
};

const getPawnImage = (color?: string | null) =>
  PAWN_IMAGES[color as PawnColor] || PAWN_IMAGES.blue;

const teamLogos: Record<string, ReturnType<typeof require>> = {
  'Andhra Blasters': require('../assets/teamLogo/AndhraBlasters.png'),
  AndhraBlasters: require('../assets/teamLogo/AndhraBlasters.png'),
  'Bangalore Indians': require('../assets/teamLogo/BangaloreIndians.png'),
  BangaloreIndians: require('../assets/teamLogo/BangaloreIndians.png'),
  'Bhopal Titans': require('../assets/teamLogo/BhopalTitans.png'),
  BhopalTitans: require('../assets/teamLogo/BhopalTitans.png'),
  'Chennai Superstars': require('../assets/teamLogo/ChennaiSuperstars.png'),
  ChennaiSuperstars: require('../assets/teamLogo/ChennaiSuperstars.png'),
  'Cuttack Gladiators': require('../assets/teamLogo/CuttackGladiators.png'),
  CuttackGladiators: require('../assets/teamLogo/CuttackGladiators.png'),
  'Delhi Fighters': require('../assets/teamLogo/DelhiFighters.png'),
  DelhiFighters: require('../assets/teamLogo/DelhiFighters.png'),
  'Gujarat Commandos': require('../assets/teamLogo/GujaratCommandos.png'),
  GujaratCommandos: require('../assets/teamLogo/GujaratCommandos.png'),
  'Guwahati Champions': require('../assets/teamLogo/GuwahatiChampions.png'),
  GuwahatiChampions: require('../assets/teamLogo/GuwahatiChampions.png'),
  'Hyderabad Nawabs': require('../assets/teamLogo/HyderabadNawabs.png'),
  HyderabadNawabs: require('../assets/teamLogo/HyderabadNawabs.png'),
  'Kerala Riders': require('../assets/teamLogo/KeralaRiders.png'),
  KeralaRiders: require('../assets/teamLogo/KeralaRiders.png'),
  'Kolkata Invincibles': require('../assets/teamLogo/KolkataInvincibles.png'),
  KolkataInvincibles: require('../assets/teamLogo/KolkataInvincibles.png'),
  'Lucknow Royals': require('../assets/teamLogo/LucknowRoyals.png'),
  LucknowRoyals: require('../assets/teamLogo/LucknowRoyals.png'),
  'Mumbai Runners': require('../assets/teamLogo/MumbaiRunners.png'),
  MumbaiRunners: require('../assets/teamLogo/MumbaiRunners.png'),
  'Nagpur Legends': require('../assets/teamLogo/NagpurLegends.png'),
  NagpurLegends: require('../assets/teamLogo/NagpurLegends.png'),
  'Patna Kings': require('../assets/teamLogo/PatnaKings.png'),
  PatnaKings: require('../assets/teamLogo/PatnaKings.png'),
  'Punjab Giants': require('../assets/teamLogo/PunjabGiants.png'),
  PunjabGiants: require('../assets/teamLogo/PunjabGiants.png'),
  'Pune Warriors': require('../assets/teamLogo/PuneWarriors.png'),
  PuneWarriors: require('../assets/teamLogo/PuneWarriors.png'),
  'Raipur Challengers': require('../assets/teamLogo/RaipurChallengers.png'),
  RaipurChallengers: require('../assets/teamLogo/RaipurChallengers.png'),
  'Ranchi Daredevils': require('../assets/teamLogo/RanchiDaredevils.png'),
  RanchiDaredevils: require('../assets/teamLogo/RanchiDaredevils.png'),
  'Rajasthan Stormers': require('../assets/teamLogo/RajasthanStormers.png'),
  RajasthanStormers: require('../assets/teamLogo/RajasthanStormers.png'),
};

const cleanupTeamName = (team?: string | null) => {
  const raw = String(team || '').trim();
  const fileName = raw.split(/[\\/]/).pop() || raw;

  return fileName
    .replace(/\.(png|jpg|jpeg|webp)$/i, '')
    .replace(/logo$/i, '')
    .trim();
};

const normalizeTeamName = (team?: string | null) =>
  cleanupTeamName(team)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const normalizedTeamLogos = Object.entries(teamLogos).reduce<
  Record<string, any>
>((logos, [teamName, logo]) => {
  logos[normalizeTeamName(teamName)] = logo;
  return logos;
}, {});

const getTeamLogo = (team?: string | null) => {
  if (!team) return null;

  const cleanedName = cleanupTeamName(team);

  return (
    teamLogos[cleanedName] ||
    normalizedTeamLogos[normalizeTeamName(cleanedName)] ||
    null
  );
};

const isPawnColor = (color?: string | null): color is PawnColor =>
  color === 'blue' ||
  color === 'red' ||
  color === 'green' ||
  color === 'yellow';

const COLOR_ACCENT: Record<PawnColor, string> = {
  red: '#e32425',
  green: '#0fba53',
  yellow: '#ff8a00',
  blue: '#1179cf',
};

// ─── component ────────────────────────────────────────────────────────────────
export default function RunScreen() {
  const { session, user } = useAuth();
  const isFlm = user?.role?.toLowerCase() === 'flm';
  const myFlmId = isFlm ? user?.id : user?.flmId;
  const [boardId, setBoardId] = useState<number | null>(null);
  const [pawns, setPawns] = useState<Pawn[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [otherBoards, setOtherBoards] = useState<any[]>([]);
  const [selectedOtherBoard, setSelectedOtherBoard] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [myDice, setMyDice] = useState<number | null>(null);
  const [boardStatus, setBoardStatus] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const creatorId = 'S1101';
  const myPlayerColor = players.find(p => p.playerId === myFlmId)?.color;
  const [activeTab, setActiveTab] = useState<'my' | 'others'>('my');
  const [myBoardId, setMyBoardId] = useState<number | null>(null);

  const getPerspectiveArea = useCallback(
    (area: number) => {
      if (!myPlayerColor) return area;

      return ((area - HOME_AREA_BY_COLOR[myPlayerColor] + 4) % 4) + 1;
    },
    [myPlayerColor],
  );

  const getPerspectiveColor = useCallback(
    (color?: string | null): PawnColor => {
      if (!isPawnColor(color)) return 'blue';
      if (!myPlayerColor) return color;

      return COLOR_BY_HOME_AREA[getPerspectiveArea(HOME_AREA_BY_COLOR[color])];
    },
    [getPerspectiveArea, myPlayerColor],
  );

  const getPerspectivePosition = useCallback(
    (position?: string | number | null) => {
      const normalized = normalizePawnPosition(position);

      if (!myPlayerColor) return normalized;

      return normalized.replace(
        /(cell-area-|home-area-)(\d+)(-id-\d+)/,
        (_match, prefix, area, suffix) =>
          `${prefix}${getPerspectiveArea(Number(area))}${suffix}`,
      );
    },
    [getPerspectiveArea, myPlayerColor],
  );

  const fetchBoardStatus = async () => {
    const res = await fetch(`${API_BASE_URL}/api/flm/boards/status`, {
      method: 'POST',
      headers: {
        ...authHeaders(session?.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creatorId,
        status: 'active',
      }),
    });

    const json = await res.json();
    if (json.success) {
      setBoardStatus(json.data || []);
    }
  };
  const fetchBoard = useCallback(async () => {
    if (!myFlmId) return;

    try {
      setLoading(true);

      // ACTIVE BOARD LIST
      const activeRes = await fetch(
        `${API_BASE_URL}/api/flm/${myFlmId}/boards/active`,
        {
          headers: authHeaders(session?.token),
        },
      );

      const activeJson = await activeRes.json();

      console.log('ACTIVE BOARD RESPONSE:', activeJson);

      if (!activeJson.success || !activeJson.data?.length) {
        setLoading(false);
        return;
      }

      // FIRST ACTIVE BOARD
      const activeBoard = activeJson.data[0];

      console.log('ACTIVE BOARD:', activeBoard);

      setBoardId(activeBoard.id);

      // FETCH BOARD DETAILS
      await fetchBoardState(activeBoard.id);

      // FETCH BOARD STATUS
      await fetchBoardStatus();
    } catch (e) {
      console.warn('fetchBoard error:', e);
    } finally {
      setLoading(false);
    }
  }, [myFlmId, session?.token]);

  const fetchBoardState = async (bid: number) => {
    try {
      console.log('FETCHING BOARD DETAILS FOR:', bid);

      const res = await fetch(`${API_BASE_URL}/api/flm/boards/navigate`, {
        method: 'POST',
        headers: {
          ...authHeaders(session?.token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator: creatorId,
          direction: 'current',
          currentBoardId: bid,
          excludePlayerId: null,
        }),
      });

      const json = await res.json();

      console.log('BOARD DETAILS RESPONSE:', json);

      if (!json.success || !json.data) {
        console.log('NO BOARD DATA FOUND');
        return;
      }

      const data = json.data;

      console.log('PLAYERS:', data.players);
      console.log('PAWNS:', data.pawns);

      // SET PAWNS
      setPawns(data.pawns || []);

      // SET PLAYERS
      setPlayers(data.players || []);

      // SET DICE
      const myDiceRow = (data.diceValue || []).find(
        (d: any) => d.playerId === myFlmId,
      );

      setMyDice(myDiceRow?.diceValue ?? null);
    } catch (e) {
      console.warn('fetchBoardState error:', e);
    }
  };
  const sleep = (ms: number) =>
    new Promise<void>(resolve => setTimeout(() => resolve(), ms));

  const getPositionInfo = (pos: string) => {
    const normal = pos.match(/cell-area-(\d+)-id-(\d+)/);

    if (normal) {
      return {
        type: 'cell',
        area: Number(normal[1]),
        id: Number(normal[2]),
      };
    }

    const home = pos.match(/home-area-(\d+)-id-(\d+)/);

    if (home) {
      return {
        type: 'home',
        area: Number(home[1]),
        id: Number(home[2]),
      };
    }

    return null;
  };

  type PositionInfo = NonNullable<ReturnType<typeof getPositionInfo>>;

  const formatPositionInfo = (pos: PositionInfo) =>
    pos.type === 'home'
      ? `home-area-${pos.area}-id-${pos.id}`
      : `cell-area-${pos.area}-id-${pos.id}`;

  const getNextPositionInfo = (
    pos: PositionInfo,
    color: PawnColor,
  ): PositionInfo | null => {
    if (pos.type === 'home') {
      return pos.id >= 6 ? null : { ...pos, id: pos.id + 1 };
    }

    const homeArea = HOME_AREA_BY_COLOR[color];

    if (pos.id === 7 && pos.area !== homeArea) {
      return {
        type: 'cell',
        area: pos.area,
        id: 13,
      };
    }

    if (pos.id === 12) {
      if (pos.area === homeArea) {
        return {
          type: 'home',
          area: homeArea,
          id: 1,
        };
      }

      return null;
    }

    if (pos.id >= 18) {
      return {
        type: 'cell',
        area: (pos.area % 4) + 1,
        id: 1,
      };
    }

    return {
      type: 'cell',
      area: pos.area,
      id: pos.id + 1,
    };
  };

  const buildMovementPath = (
    oldPos: PositionInfo | null,
    newPos: PositionInfo | null,
    color: PawnColor,
  ) => {
    if (!oldPos || !newPos) return null;

    const path: string[] = [];
    let cursor = oldPos;

    for (let steps = 0; steps < 100; steps++) {
      const next = getNextPositionInfo(cursor, color);

      if (!next) return null;

      path.push(formatPositionInfo(next));

      if (
        next.type === newPos.type &&
        next.area === newPos.area &&
        next.id === newPos.id
      ) {
        return path;
      }

      cursor = next;
    }

    return null;
  };

  const animatePawnMovement = async (oldPawn: Pawn, newPawn: Pawn) => {
    const oldPos = getPositionInfo(oldPawn.currentPosition);

    const newPos = getPositionInfo(newPawn.currentPosition);

    const movementPath = buildMovementPath(
      oldPos,
      newPos,
      newPawn.color as PawnColor,
    );

    // fallback
    if (!movementPath) {
      setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));

      return;
    }

    // different track type → jump
    for (const currentPosition of movementPath) {
      await sleep(300);

      setPawns(prev =>
        prev.map(p =>
          p.id === newPawn.id
            ? {
                ...p,
                currentPosition,
                type: newPawn.type,
                moves: newPawn.moves,
              }
            : p,
        ),
      );
    }

    // final sync
    setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));
  };
  const fetchOtherBoards = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/flm/boards/status`, {
        method: 'POST',
        headers: {
          ...authHeaders(session?.token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId,
          status: 'active',
        }),
      });

      const json = await res.json();

      if (json.success) {
        const boards = (json.data || []).filter((b: any) => b.id !== boardId);

        setOtherBoards(boards);
      }
    } catch (e) {
      console.log('fetchOtherBoards error:', e);
    }
  };
  // ── socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBoard();
    fetchOtherBoards();
  }, [fetchBoard]);
  const pawnsRef = useRef<Pawn[]>([]);

  useEffect(() => {
    pawnsRef.current = pawns;
  }, [pawns]);
  useEffect(() => {
    if (!boardId) return;

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);

      socket.emit('joinRoom', {
        boardId,
        isSpectator: true,
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // pawn moved
    socket.on('pawnMoved', async (delta: any) => {
      const d = delta?.data;

      if (!d || d.boardId !== boardId) return;

      // animate pawn movement
      if (d.updatedPawns?.length) {
        for (const updatedPawn of d.updatedPawns) {
          const oldPawn = pawnsRef.current.find(p => p.id === updatedPawn.id);

          if (!oldPawn) continue;

          await animatePawnMovement(oldPawn, updatedPawn);
        }
      }

      // update players
      // update players
      if (d.updatedPlayers?.length) {
        setPlayers(prev => {
          return prev.map(existingPlayer => {
            const updatedPlayer = d.updatedPlayers.find(
              (p: Player) => p.playerId === existingPlayer.playerId,
            );

            if (!updatedPlayer) {
              return existingPlayer;
            }

            return {
              ...existingPlayer,

              moves:
                updatedPlayer.moves !== undefined
                  ? Number(updatedPlayer.moves)
                  : existingPlayer.moves,

              home:
                updatedPlayer.home !== undefined
                  ? Number(updatedPlayer.home)
                  : existingPlayer.home,

              currentDiceRollBalance:
                updatedPlayer.currentDiceRollBalance !== undefined
                  ? Number(updatedPlayer.currentDiceRollBalance)
                  : existingPlayer.currentDiceRollBalance,

              rank: updatedPlayer.rank ?? existingPlayer.rank,

              winPosition:
                updatedPlayer.winPosition ?? existingPlayer.winPosition,
            };
          });
        });
      }

      // update dice
      if (d.updatedDice?.length) {
        const myRow = d.updatedDice.find(
          (r: any) => r.playerId === (isFlm ? myFlmId : user?.id),
        );

        if (myRow !== undefined) {
          setMyDice(myRow?.diceValue ?? null);
        }
      }
    });

    // upload approved
    socket.on('uploadStatusChanged', () => {
      if (boardId) {
        fetchBoardState(boardId);
      }
    });

    return () => {
      socket.emit('leaveRoom', { boardId });

      socket.disconnect();

      socketRef.current = null;
    };
  }, [boardId]);

  const getPlayerTeamLogo = (player: Player) => {
    const board = boardStatus.find(b => String(b.id) === String(boardId));

    const matchedPlayer = board?.players?.find(
      (p: any) => p.playerId === player.playerId,
    );

    return getTeamLogo(matchedPlayer?.teamName);
  };

  // ── render pawn on board ──────────────────────────────────────────────────
  const renderBoardPawns = (): React.ReactElement[] => {
    // group pawns at same position
    const posMap = new Map<string, Pawn[]>();
    pawns.forEach(pawn => {
      if (isBasePawn(pawn)) return;
      const perspectiveColor = getPerspectiveColor(pawn.color);
      const grid = positionToGrid(
        isCenterPawn(pawn)
          ? 'finished'
          : getPerspectivePosition(pawn.currentPosition),
        perspectiveColor,
      );
      if (!grid) return;
      const key = `${grid[0]},${grid[1]}`;
      if (!posMap.has(key)) posMap.set(key, []);
      posMap.get(key)!.push(pawn);
    });
    const elements: JSX.Element[] = [];
    posMap.forEach((group, key) => {
      const [col, row] = key.split(',').map(Number);
      const pixel = gridToPixel(col, row);
      group.forEach((pawn, i) => {
        const offset =
          group.length > 1 ? (i - (group.length - 1) / 2) * s(5) : 0;
        elements.push(
          <View
            key={pawn.id}
            style={[
              styles.boardPawn,
              { left: pixel.left + offset, top: pixel.top },
            ]}
          >
            <View style={styles.pawnBackplate}>
              <Image
                source={getPawnImage(getPerspectiveColor(pawn.color))}
                style={styles.boardPawnImage}
              />
            </View>
          </View>,
        );
      });
    });
    return elements;
  };

  // ── render base pawns in home corners ────────────────────────────────────
  const renderBasePawns = (): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    const basePawnsByColor: Record<string, Pawn[]> = {};
    pawns.filter(isBasePawn).forEach(p => {
      const perspectiveColor = getPerspectiveColor(p.color);
      if (!basePawnsByColor[perspectiveColor]) {
        basePawnsByColor[perspectiveColor] = [];
      }
      basePawnsByColor[perspectiveColor].push(p);
    });

    Object.entries(basePawnsByColor).forEach(([color, colorPawns]) => {
      const positions = BASE_POSITIONS[color] || [];
      colorPawns.forEach((pawn, i) => {
        const pos = positions[i];
        if (!pos) return;
        const pixel = gridToPixel(pos[0], pos[1]);

        elements.push(
          <View
            key={pawn.id}
            style={[styles.boardPawn, { left: pixel.left, top: pixel.top }]}
          >
            <View style={styles.pawnBackplate}>
              <Image
                source={getPawnImage(pawn.color)}
                style={styles.boardPawnImage}
              />
            </View>
          </View>,
        );
      });
    });

    return elements;
  };

  const myPlayer = players.find(p => p.playerId === myFlmId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8e35ff" />
        <Text style={styles.loadingText}>Loading board...</Text>
      </View>
    );
  }

  if (!boardId) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="sports-esports" size={s(48)} color="#8e35ff" />
        <Text style={styles.loadingText}>No active board found</Text>
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topSwitcher}>
        <TouchableOpacity
          style={[
            styles.switchTab,
            activeTab === 'my' && styles.activeSwitchTab,
          ]}
          onPress={() => setActiveTab('my')}
        >
          <Text
            style={[
              styles.switchText,
              activeTab === 'my' && styles.activeSwitchText,
            ]}
          >
            My Board
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.switchTab,
            activeTab === 'others' && styles.activeSwitchTab,
          ]}
          onPress={() => setActiveTab('others')}
        >
          <Text
            style={[
              styles.switchText,
              activeTab === 'others' && styles.activeSwitchText,
            ]}
          >
            Other Boards
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'others' && (
        <View style={styles.boardSelectorRow}>
          {/* Previous */}
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => {
              if (!otherBoards.length) return;

              const currentIndex = otherBoards.findIndex(
                b => b.id === selectedOtherBoard,
              );

              const prev =
                currentIndex <= 0
                  ? otherBoards[otherBoards.length - 1]
                  : otherBoards[currentIndex - 1];

              setSelectedOtherBoard(prev.id);
              setBoardId(prev.id);

              fetchBoardState(prev.id);
            }}
          >
            <Icon name="chevron-left" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.boardLabel}>Board -</Text>

          <TextInput
            value={String(selectedOtherBoard || '')}
            placeholder="Board ID"
            placeholderTextColor="#777"
            keyboardType="numeric"
            style={styles.boardInput}
            onChangeText={txt => setSelectedOtherBoard(Number(txt))}
          />

          <TouchableOpacity
            style={styles.goBtn}
            onPress={() => {
              if (!selectedOtherBoard) return;

              setBoardId(selectedOtherBoard);

              fetchBoardState(selectedOtherBoard);
            }}
          >
            <Text style={styles.goBtnText}>Go</Text>
          </TouchableOpacity>

          {/* Refresh */}
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchOtherBoards}
          >
            <Icon name="refresh" size={20} color="#222" />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => {
              if (!otherBoards.length) return;

              const currentIndex = otherBoards.findIndex(
                b => b.id === selectedOtherBoard,
              );

              const next =
                currentIndex >= otherBoards.length - 1
                  ? otherBoards[0]
                  : otherBoards[currentIndex + 1];

              setSelectedOtherBoard(next.id);
              setBoardId(next.id);

              fetchBoardState(next.id);
            }}
          >
            <Icon name="chevron-right" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.teamsContainer}>
  {players.map((player, index) => {
    const perspectiveColor = getPerspectiveColor(player.color);

    return (
      <View
        key={player.playerId}
        style={[
          styles.teamCard,
          player.playerId === myFlmId && styles.activeTeamCard,
        ]}
      >
        {/* Top Number */}
        <View style={styles.teamNumberCircle}>
          <Text style={styles.teamNumberText}>
            {index + 1}
          </Text>
        </View>

        {/* Team Name */}
        <Text style={styles.teamTitle} numberOfLines={2}>
          {player.teamName || player.playerName}
        </Text>

        {/* Bottom Stats */}
        <View style={styles.teamBottom}>
          <View style={styles.teamStat}>
            <Image
              source={require('../assets/gameAssets/moves.png')}
              style={styles.crossIcon}
            />
            <Text style={styles.teamStatText}>
              {player.moves}
            </Text>
          </View>

          <View style={styles.teamStat}>
            <Image
              source={getPawnImage(perspectiveColor)}
              style={styles.teamPawn}
            />
            <Text style={styles.teamStatText}>
              {player.home}
            </Text>
          </View>
        </View>

        {/* YOU TAG */}
        {player.playerId === myFlmId && (
          <View style={styles.youMiniTag}>
            <Text style={styles.youMiniText}>
              You
            </Text>
          </View>
        )}
      </View>
    );
  })}
</View>

      {/* Board */}
      <View style={styles.boardArea}>
        <Image
          source={require('../assets/gameAssets/ludo-board.png')}
          style={styles.boardImage}
        />

        {/* Player cards in corners */}
        {players.map(player => {
          const colorNumberMap: Record<PawnColor, number> = {
            blue: 1,
            red: 2,
            green: 3,
            yellow: 4,
          };
          const perspectiveColor = getPerspectiveColor(player.color);

          return (
            <React.Fragment key={player.playerId}>
              <View>
                <View
                  style={[
                    styles.playerBadge,
                    { backgroundColor: COLOR_ACCENT[perspectiveColor] },
                  ]}
                >
                  <Text style={styles.playerBadgeText}>
                    {colorNumberMap[perspectiveColor]}
                  </Text>
                </View>
              </View>
            </React.Fragment>
          );
        })}

        {/* Pawns on board */}
        <View pointerEvents="none" style={styles.pawnLayer}>
          {/* {renderDebugGrid()} */}
          {renderBasePawns()}
          {renderBoardPawns()}
        </View>
        <View style={styles.logicLayer}>
          {/* Green */}
          <Text style={[styles.logicText, { top: '3.2%', left: '47.5%' }]}>
            -6
          </Text>
          <Text style={[styles.logicText, { top: '22%', left: '41%' }]}>
            -1
          </Text>
          <Text style={[styles.logicText, { top: '34.5%', left: '53.5%' }]}>
            -3
          </Text>
          {/* Red */}
          <Text style={[styles.logicText, { top: '47%', left: '3.5%' }]}>
            -6
          </Text>
          <Text style={[styles.logicText, { top: '40.7%', left: '34.7%' }]}>
            -3
          </Text>
          <Text style={[styles.logicText, { top: '53.5%', left: '22.5%' }]}>
            -1
          </Text>

          {/* Yellow */}
          <Text style={[styles.logicText, { top: '47.3%', left: '91.5%' }]}>
            -6
          </Text>
          <Text style={[styles.logicText, { top: '53.3%', left: '60.2%' }]}>
            -3
          </Text>
          <Text style={[styles.logicText, { top: '40.7%', left: '72.4%' }]}>
            -1
          </Text>

          {/* BLUE */}
          <Text style={[styles.logicText, { top: '91%', left: '47.5%' }]}>
            -6
          </Text>
          <Text style={[styles.logicText, { top: '59.7%', left: '41.2%' }]}>
            -3
          </Text>
          <Text style={[styles.logicText, { top: '72.3%', left: '53.7%' }]}>
            -1
          </Text>
        </View>
        {/* My badge */}
        {myPlayer && (
          <View style={styles.youBadge}>
            <Text style={styles.youText}>You</Text>
            <Image
              source={require('../assets/gameAssets/moves.png')}
              style={styles.statIcon}
            />
            <Text style={styles.youText}>{myPlayer.moves}</Text>
            {myDice != null && <Text style={styles.youText}>🎲{myDice}</Text>}
          </View>
        )}
      </View>
      <View style={styles.bottomPanel}>
  
  {/* LEFT */}
  <View style={styles.bottomPlayerBox}>
    <Image
      source={require('../assets/icons/team.png')}
      style={styles.bottomLogo}
    />

    <Text style={styles.bottomPlayerText}>
      Player Waiting
    </Text>

    <View style={styles.bottomStats}>
      <Text style={styles.bottomStat}>
        No upcoming
      </Text>
    </View>
  </View>

  {/* CENTER */}
  <View style={styles.bottomDice}>
    <Text style={styles.bottomDiceText}>
      No{"\n"}dice
    </Text>
  </View>

  {/* RIGHT */}
  <View style={styles.bottomPlayerBox}>
    <Image
      source={require('../assets/icons/team.png')}
      style={styles.bottomLogo}
    />

    <Text style={styles.bottomPlayerText}>
      Akash
    </Text>

    <View style={styles.bottomStats}>
      <Text style={styles.bottomStat}>
        No upcoming
      </Text>
    </View>
  </View>
</View>

{/* FLOATING BUTTON */}
<TouchableOpacity style={styles.chatButton}>
  <Icon name="forum" size={24} color="#fff" />
</TouchableOpacity>

{/* BOTTOM NAV
<View style={styles.bottomNav}>
  <Icon name="home" size={24} color="#fff" />
  <Icon name="casino" size={24} color="#fff" />
  <Icon name="emoji-events" size={24} color="#fff" />
  <Icon name="cloud-upload" size={24} color="#fff" />
  <Icon name="thumb-up" size={24} color="#fff" />
  <Icon name="notifications" size={24} color="#fff" />
</View> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bottomPanel: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#101010',
  marginHorizontal: s(5),
  paddingHorizontal: s(10),
  paddingVertical: s(8),
},

bottomPlayerBox: {
  width: '30%',
  alignItems: 'center',
},

bottomLogo: {
  width: s(34),
  height: s(34),
  resizeMode: 'contain',
},

bottomPlayerText: {
  color: '#ccc',
  fontSize: s(10),
  textAlign: 'center',
  marginTop: s(4),
  fontWeight: '600',
},

bottomStats: {
  marginTop: s(4),
},

bottomStat: {
  color: '#999',
  fontWeight: '600',
  fontSize: s(9),
},

bottomDice: {
  width: s(56),
  height: s(56),
  borderRadius: s(8),
  backgroundColor: '#2a2a2a',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#444',
},

bottomDiceText: {
  color: '#777',
  fontWeight: '700',
  textAlign: 'center',
  fontSize: s(10),
},

chatButton: {
  position: 'absolute',
  right: s(16),
  bottom: s(76),
  width: s(58),
  height: s(58),
  borderRadius: s(29),
  backgroundColor: '#8c32ff',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#fff',
  elevation: 10,
},

bottomNav: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: s(62),
  backgroundColor: '#9b5cff',
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
},
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(12),
  },
  loadingText: { color: '#FFF', fontSize: s(14), fontWeight: '600' },
  logicLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'none',
    height: '100%',
    width: '100%',
  },

  logicText: {
    position: 'absolute',
    color: 'red',
    fontSize: s(16),
    fontWeight: '500',
    paddingHorizontal: s(4),
    paddingVertical: s(1),
    borderRadius: s(2),
    borderWidth: 1,
    borderColor: '#fff',
    zIndex: 99999,
    elevation: 99999,
  },
  boardArea: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'relative',
    backgroundColor: '#030303',
    overflow: 'hidden',
    borderRadius: s(4),
    alignSelf: 'center',
    marginVertical: s(8),
    borderWidth: 1,
    borderColor: '#333',
  },
  boardImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
    zIndex: 0,
  },
  pawnLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    elevation: 50,
  },
  playerBadge: {
    position: 'absolute',
    left: s(-9),
    top: s(-9),
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    zIndex: 7,
    elevation: 7,
  },
  playerBadgeText: { color: 'white', fontSize: s(10), fontWeight: '900' },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(3),
    height: s(15),
  },
  statText: {
    color: '#2b2b2b',
    fontSize: s(10),
    fontWeight: '800',
    marginRight: s(4),
  },
  statIcon: { width: s(12), height: s(12), resizeMode: 'contain' },
  boardTeamLogo: {
    width: BOARD_SIZE * 0.18,
    height: BOARD_SIZE * 0.115,
    resizeMode: 'contain',
  },
  boardPawn: {
    position: 'absolute',
    width: PAWN_SIZE,
    height: PAWN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 51,
    elevation: 51,
  },
  pawnBackplate: {
    width: '100%',
    height: '100%',
    borderRadius: PAWN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: s(3),
    shadowOffset: { width: 0, height: s(2) },
    elevation: 52,
  },
  boardPawnImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  youBadge: {
    position: 'absolute',
    left: BOARD_SIZE * 0.12,
    bottom: s(6),
    height: s(22),
    borderRadius: s(10),
    backgroundColor: '#0069ba',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(8),
    gap: s(6),
    zIndex: 7,
  },
  youText: { color: 'white', fontSize: s(12), fontWeight: '800' },
  topSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    marginHorizontal: s(14),
    marginTop: s(10),
    borderRadius: s(22),
    padding: s(4),
    borderWidth: 1,
    borderColor: '#333',
  },

  switchTab: {
    flex: 1,
    height: s(32),
    borderRadius: s(18),
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeSwitchTab: {
    backgroundColor: '#004c97',
  },

  switchText: {
    color: '#888',
    fontWeight: '700',
    fontSize: s(13),
  },

  activeSwitchText: {
    color: '#fff',
  },

  boardSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(10),
    marginBottom: s(8),
    gap: s(6),
  },

  circleBtn: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: '#1976ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  boardLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: s(13),
  },

  boardInput: {
    width: s(70),
    height: s(34),
    backgroundColor: '#fff',
    borderRadius: s(6),
    paddingHorizontal: s(10),
    color: '#000',
    fontWeight: '700',
  },

  goBtn: {
    height: s(34),
    paddingHorizontal: s(14),
    backgroundColor: '#d9d9d9',
    borderRadius: s(6),
    justifyContent: 'center',
    alignItems: 'center',
  },

  goBtnText: {
    color: '#111',
    fontWeight: '700',
  },

  refreshBtn: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: s(10),
    marginTop: s(10),
    marginBottom: s(8),
    gap: s(8),
  },

  teamCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: s(8),
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: s(10),
    paddingVertical: s(10),
    elevation: 3,
  },

  activeTeamCard: {
    borderColor: '#005eff',
    borderWidth: 2,
  },

teamNumberCircle: {
  position: 'absolute',
  top: -10,
  alignSelf: 'center',
  width: s(22),
  height: s(22),
  borderRadius: s(11),
  backgroundColor: '#f2b000',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
},

teamNumberText: {
  color: '#000',
  fontWeight: '900',
  fontSize: s(11),
},

  teamTitle: {
  color: '#ccc',
  fontSize: s(12),
  fontWeight: '700',
  minHeight: s(26),
},

teamBottom: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: s(6),
},

teamStat: {
  flexDirection: 'row',
  alignItems: 'center',
},

crossIcon: {
  width: s(16),
  height: s(16),
  resizeMode: 'contain',
  marginRight: s(3),
  tintColor: '#ff4444',
},

teamPawn: {
  width: s(16),
  height: s(16),
  resizeMode: 'contain',
  marginRight: s(3),
},

teamStatText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: s(12),
},

youMiniTag: {
  position: 'absolute',
  right: s(4),
  top: s(4),
  backgroundColor: '#2d74ff',
  paddingHorizontal: s(5),
  paddingVertical: s(1),
  borderRadius: s(4),
},

youMiniText: {
  color: '#fff',
  fontSize: s(9),
  fontWeight: '700',
},
});