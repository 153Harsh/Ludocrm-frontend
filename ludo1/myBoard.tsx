import React, { useEffect, useRef, useState, useCallback, JSX } from 'react';

import {
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, authHeaders } from '../api';
import { useAuth } from '../auth/AuthContext';
import DiceOne from '../assets/dice1.png';
import DiceTwo from '../assets/dice2.png';
import DiceThree from '../assets/dice3.png';
import DiceFour from '../assets/dice4.png';
import DiceFive from '../assets/dice5.png';
import DiceSix from '../assets/dice6.png';
import { useNavigation, } from '@react-navigation/native';
import Chat from '../ludo2/chat';
import AlertModal, { AlertButton } from '../components/AlertModal';
import Toast from 'react-native-toast-message';
// import Sound from 'react-native-nitro-sound';
const { width: W, height: H } = Dimensions.get('window');
const s = (size: number) => (Math.min(W, H) / 390) * size;
const BOARD_SIZE = W * 0.95;
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
const AREA_TRACK: Record<number, Array<[number, number]>> = {
  1: [
    [8, 9],
    [8, 10],
    [8, 11],
    [8, 12],
    [8, 13],
    [8, 14],
    [7, 14],
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [6, 14],
    [6, 13],
    [6, 12],
    [6, 11],
    [6, 10],
    [6, 9],
  ],
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
const FINISH_POSITIONS: Record<string, [number, number]> = {
  red: [6, 7],
  green: [7, 6],
  blue: [7, 8],
  yellow: [8, 7],
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
type PawnColor = 'red' | 'green' | 'yellow' | 'blue';

interface Pawn {
  id: string;
  playerId: string;
  color: PawnColor;
  type: string;
  currentPosition: string;
  moves: number;
}
interface Player {
  playerId: string;
  playerName: string;
  color: PawnColor;
  moves: number;
  kills: number;
  currentDiceRollBalance: number;
  home: number;
  rank?: number | null;
  winPosition?: number | null;
  teamName?: string;
  lastMovedAt?: string;
  movesLost?: number;
  hearts?: number;
}
type DiceByPlayerRow = {
  playerId: string;
  teamId?: string;
  role?: string;
  diceValue: number | null;
  uploadId?: string | null;
  rolledAt?: string | null;
};

type TurnState = {
  mode?: 'free' | 'turn' | string;
  currentTurnPlayerId?: string | null;
  turnOrder?: string[];
};

type LoggedInMrStats = {
  mrId?: string;
  flmId?: string;
  currentDiceRollBalance?: number;
  currentHeartBalance?: number;
  mrBoardMoves?: number;
  unplayedDiceValue?: number | null;
  unplayedDiceRolledAt?: string | null;
};

const DICE_IMAGE_BY_VALUE: Record<number, any> = {
  1: DiceOne,
  2: DiceTwo,
  3: DiceThree,
  4: DiceFour,
  5: DiceFive,
  6: DiceSix,
};

// const joinSound = new Sound(
//   require('../assets/sound/Notification.mp3'),
//   error => {
//     if (error) {
//       console.log('Sound load error', error);
//     }
//   },
// );

const PAWN_IMAGES = {
  red: require('../assets/gameAssets/pawn-red.png'),
  green: require('../assets/gameAssets/pawn-green.png'),
  yellow: require('../assets/gameAssets/pawn-yellow.png'),
  blue: require('../assets/gameAssets/pawn-blue.png'),
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

const isPawnColor = (color?: string | null): color is PawnColor =>
  color === 'blue' ||
  color === 'red' ||
  color === 'green' ||
  color === 'yellow';
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

const normalizeDiceRows = (rows?: any[]): DiceByPlayerRow[] =>
  (Array.isArray(rows) ? rows : []).map((d: any) => ({
    playerId: String(d.teamPlayerId || d.teamId || d.playerId),
    teamId:
      d.teamId === null || d.teamId === undefined ? undefined : String(d.teamId),
    role: d.role === null || d.role === undefined ? undefined : String(d.role),
    diceValue:
      d.diceValue === null || d.diceValue === undefined
        ? null
        : Number(d.diceValue),
    uploadId:
      d.id === null || d.id === undefined
        ? d.uploadId === null || d.uploadId === undefined
          ? null
          : String(d.uploadId)
        : String(d.id),
    rolledAt: d.rolledAt ?? d.dateOfUpload ?? null,
  }));

function positionToGrid(pos: string, color: string): [number, number] | null {
  if (!pos || pos === '0') return null;
  if (pos === 'finished') return FINISH_POSITIONS[color] || null;
  const homeMatch = pos.match(/home-area-(\d+)-id-(\d+)/);
  if (homeMatch) {
    const homeId = Number(homeMatch[2]);
    const homeTrack = HOME_TRACK[color];
    return homeTrack?.[homeId - 1] ?? null;
  }
  const match = pos.match(/cell-area-(\d+)-id-(\d+)/);
  if (!match) return null;
  const areaId = Number(match[1]);
  const cellNum = Number(match[2]);
  const track = AREA_TRACK[areaId];
  return track?.[cellNum - 1] ?? null;
}

function gridToPixel(col: number, row: number) {
  return {
    left: GRID_LEFT + col * TILE_W + TILE_W / 2 - PAWN_SIZE / 2,
    top: GRID_TOP + row * TILE_H + TILE_H / 2 - PAWN_TIP,
  };
}

export default function MyBoardScreen(): React.ReactElement {
  
  const { session, user } = useAuth();
  const isFlm = user?.role?.toLowerCase() === 'flm';
  const myFlmId = isFlm ? user?.id : user?.flmId;

  const [boardId, setBoardId] = useState<number | null>(null);
  const [pawns, setPawns] = useState<Pawn[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [diceRows, setDiceRows] = useState<DiceByPlayerRow[]>([]);
  const myPlayerColor =
  players.find(p => p.playerId === myFlmId)?.color || 'blue';

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

    return COLOR_BY_HOME_AREA[
      getPerspectiveArea(HOME_AREA_BY_COLOR[color])
    ];
  },
  [getPerspectiveArea],
);

const getPerspectivePosition = useCallback(
  (position?: string | number | null) => {
    const normalized = String(position ?? '').trim();

    return normalized.replace(
      /(cell-area-|home-area-)(\d+)(-id-\d+)/,
      (_match, prefix, area, suffix) =>
        `${prefix}${getPerspectiveArea(Number(area))}${suffix}`,
    );
  },
  [getPerspectiveArea],
);

  const socketRef = useRef<Socket | null>(null);
  const creatorId = 'A1234';

  const pawnsRef = useRef<Pawn[]>([]);
  const [boardData, setBoardData] = useState<any>(null);
  const [activePlayers, setActivePlayers] = useState<any[]>([]);
const [showChat, setShowChat] =
  useState(false);
  const [turnState, setTurnState] = useState<TurnState | null>(null);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number | null>(null);
  const [loggedInMrStats, setLoggedInMrStats] =
    useState<LoggedInMrStats | null>(null);
  
  const [currentDiceValue, setCurrentDiceValue] = useState<number | null>(null);

  const [isSelectingDice, setIsSelectingDice] = useState(false);

  const navigation = useNavigation();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertVariant, setAlertVariant] = useState<'info' | 'error' | 'confirm'>('info');
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);


  const showAlert = (opts: {
    title?: string;
    message?: string;
    variant?: 'info' | 'error' | 'confirm';
    buttons?: AlertButton[];
  }) => {
    setAlertTitle(opts.title ?? '');
    setAlertMessage(opts.message ?? '');
    setAlertVariant(opts.variant ?? 'info');
    setAlertButtons(opts.buttons ?? []);
    setAlertVisible(true);
  };

  
  const closeAlert = () => setAlertVisible(false);

  const withClose =
    (fn?: () => void) =>
    () => {
      closeAlert();
      fn?.();
    };
  useEffect(() => {
    (globalThis as any).boardId = boardId;

    return () => {
      (globalThis as any).boardId = null;
      (globalThis as any).isMyBoardActivePlayer = false;
    };
  }, [boardId]);

  useEffect(() => {
    const isActiveOnMyBoard =
      !!boardId &&
      activePlayers.some(
        player =>
          String(player.boardId) === String(boardId) &&
          String(player.playerId) === String(user?.id) &&
          String(player.flmId) === String(myFlmId),
      );

    (globalThis as any).isMyBoardActivePlayer = isActiveOnMyBoard;
  }, [activePlayers, boardId, myFlmId, user?.id]);
  const fetchActivePlayers = async (bid: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/active-player/board/${bid}`,
        {
          headers: authHeaders(session?.token),
        },
      );

      const json = await res.json();

      if (json?.success) {
        setActivePlayers(json.data || []);
      }
    } catch (err) {

    }
  };
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!(globalThis as any).isMyBoardActivePlayer) {
        return;
      }

      e.preventDefault();

      showAlert({
        title: 'Leave Board',
        message: 'Want to leave board?',
        variant: 'confirm',
        buttons: [
          {
            text: 'No',
            style: 'cancel',
            onPress: withClose(),
          },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: withClose(async () => {
              try {
                fetch(`${API_BASE_URL}/api/active-player/end`, {
                  method: 'POST',
                  headers: {
                    ...authHeaders(session?.token),
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    boardId,
                    playerId: user?.id,
                    playerRole: user?.role,
                    flmId: myFlmId,
                  }),
                });

                socketRef.current?.emit('playerLeft', {
                  boardId,
                  playerId: myFlmId,
                  userId: user?.id,
                });

                (globalThis as any).isMyBoardActivePlayer = false;
                (globalThis as any).boardId = null;

                navigation.dispatch(e.data.action);
              } catch (err) {
                // console.log(err);
              }
            }),
          },
        ],
      });
    });

    return unsubscribe;
  }, [navigation, boardId, myFlmId, session?.token, user?.id, user?.role]);

  useEffect(() => {
    pawnsRef.current = pawns;
  }, [pawns]);

  const fetchBoard = useCallback(async () => {
    if (!myFlmId) return;

    try {
      setLoading(true);

      const activeRes = await fetch(
        `${API_BASE_URL}/api/flm/${myFlmId}/boards/active`,
        {
          headers: authHeaders(session?.token),
        },
      );

      const activeJson = await activeRes.json();

      if (!activeJson.success || !activeJson.data?.length) {
        setLoading(false);
        return;
      }

      const activeBoard = activeJson.data[0];

      setBoardId(activeBoard.id);
      fetchBoardState(activeBoard.id);

      setLoading(false);
    } catch (e) {
      console.warn('fetchBoard error:', e);

      setLoading(false);
    }
  }, [myFlmId, session?.token]);

  const fetchBoardState = async (bid: number) => {
    try {
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
      if (!json.success || !json.data) return;

      setPawns(json.data.pawns || []);
      setPlayers(json.data.players || []);
      setBoardData(json.data);
      setLoggedInMrStats(json.data.loggedInMrStats || null);
      if (json.data.loggedInMrStats?.unplayedDiceValue) {
        setCurrentDiceValue(Number(json.data.loggedInMrStats.unplayedDiceValue));
      }

      const incomingDiceRows = normalizeDiceRows(
        json.data.diceValue || json.data.allPlayersDice || [],
      );

      setDiceRows(incomingDiceRows);
    } catch (e) {
      console.warn('fetchBoardState error:', e);
    }
    fetchActivePlayers(bid);
  };

  const sleep = (ms: number) =>
    new Promise<void>(resolve => setTimeout(() => resolve(), ms));

  const animatePawnMovement = async (
    oldPawn: any,
    newPawn: any,
    movedPawnData?: any,
  ) => {
    try {
      if (!movedPawnData?.steps) {
        setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));

        return;
      }

      const steps = Number(movedPawnData.steps);

      if (!steps || steps <= 0) {
        setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));

        return;
      }
      let currentPos = oldPawn.currentPosition;

      for (let i = 0; i < steps; i++) {
        currentPos = getNextCellPosition(currentPos, oldPawn.color);

        const animatedPawn = {
          ...oldPawn,
          currentPosition: currentPos,
        };

        setPawns(prev =>
          prev.map(p => (p.id === animatedPawn.id ? animatedPawn : p)),
        );

        await sleep(50);
      }

      setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));
    } catch (err) {
      // console.log('❌ animation error:', err);
      setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));
    }
  };

const buildRouteForColor = (color: PawnColor): string[] => {
  const homeAreaId = HOME_AREA_BY_COLOR[color] ?? 1;
  const route: string[] = [];

  const getNextRouteCell = (areaId: number, cellNum: number) => {
    if (cellNum === 7 && areaId !== homeAreaId) {
      return { areaId, cellNum: 13 };
    }

    let nextAreaId = areaId;
    let nextCellNum = cellNum + 1;

    if (nextCellNum > 18) {
      nextCellNum = 1;
      nextAreaId = (areaId % 4) + 1;
    }

    return { areaId: nextAreaId, cellNum: nextCellNum };
  };

  let areaId = homeAreaId;
  let cellNum = 14;

  while (true) {
    route.push(`cell-area-${areaId}-id-${cellNum}`);

    if (areaId === homeAreaId && cellNum === 12) {
      break;
    }

    const next = getNextRouteCell(areaId, cellNum);
    areaId = next.areaId;
    cellNum = next.cellNum;

    if (route.length > 100) {
      break;
    }
  }

  return route;
};

const ROUTES_BY_COLOR: Record<string, string[]> = {
  red: buildRouteForColor('red'),
  blue: buildRouteForColor('blue'),
  green: buildRouteForColor('green'),
  yellow: buildRouteForColor('yellow'),
};

const getNextCellPosition = (
  currentPosition: string,
  color: string,
) => {
  if (currentPosition === 'finished') {
    return 'finished';
  }

  const route =
    ROUTES_BY_COLOR[color] ||
    ROUTES_BY_COLOR.red;

  const currentIndex =
    route.indexOf(currentPosition);

  if (currentIndex === -1) {
    return currentPosition;
  }

  if (currentIndex === route.length - 1) {
    return 'finished';
  }

  return route[currentIndex + 1];
};

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!boardId || !myFlmId) {
      return;
    }

    if (socketRef.current) {
      // console.log('⚠️ Socket already exists');
      return;
    }

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {

      socket.emit(
        'joinGame',
        {
          boardId,
          playerId: myFlmId,
          userId: user?.id,
        },
        (response: any) => {

          if (!response?.ok) {
            // console.log('❌ Join failed:', response?.msg);
            return;
          }

          const data = response?.data;

          if (!data) {
            // console.log('❌ No join data');
            return;
          }
          setPlayers(data.players || []);
          setPawns(data.pawns || []);
          setBoardData(data);
          setTurnState(response?.turnState || null);
          setLoggedInMrStats(data.loggedInMrStats || null);
          if (data.loggedInMrStats?.unplayedDiceValue) {
            setCurrentDiceValue(Number(data.loggedInMrStats.unplayedDiceValue));
          }
          const incomingDiceRows = normalizeDiceRows(
            data.diceValue || data.allPlayersDice || [],
          );

          setDiceRows(incomingDiceRows);
          fetchActivePlayers(boardId);
        },
      );
      
    });
    socket.on('disconnect', reason => {
      // console.log('❌ Socket disconnected:', reason);
    });
    socket.on('connect_error', err => {
      // console.log('❌ connect_error', err);
    });

    socket.on('error', err => {
      // console.log('❌ socket error', err);
    });
    socket.onAny((event, ...args) => {
        // console.log('📡 SOCKET EVENT =>', event);
    });
    socket.on('activePlayerJoined', async (data: any) => {
      console.log('🟣 activePlayerJoined', data);

      if (data?.boardId !== boardId) {
        return;
      }
      Toast.show({
    type: 'success',
    text1: 'Player Joined',
    text2: `${data?.playerName || 'A player'} joined the board`,
    position: 'top',
    visibilityTime: 3000,
  });

//       joinSound.stop(() => {
//   joinSound.play();
// });
      fetchActivePlayers(boardId);
      if (data?.turnState) {
        setTurnState(data.turnState);
      }
      if (
        data?.loggedInMrStats &&
        String(data.loggedInMrStats.flmId) === String(myFlmId)
      ) {
        setLoggedInMrStats(data.loggedInMrStats);
        if (data.loggedInMrStats.unplayedDiceValue) {
          setCurrentDiceValue(Number(data.loggedInMrStats.unplayedDiceValue));
        }
      }
    });
    socket.on('playerJoined', (data: any) => {

      if (data?.boardId !== boardId) {
        return;
      }
//       joinSound.stop(() => {
//   joinSound.play();
// });
      fetchActivePlayers(boardId);
    });
    socket.on('activePlayerLeft', async (data: any) => {

      if (data?.boardId !== boardId) {
        return;
      }
      Toast.show({
  type: 'error',
  text1: 'Player Left',
  text2: `${data?.playerName || 'A player'} left the board`,
  position: 'top',
  visibilityTime: 3000,
});
    });
    socket.on('roomUpdate', (data: any) => {

      if (data?.boardId !== boardId) {
        return;
      }
      if (data?.turnState) {
        setTurnState(data.turnState);
      }
    });
    socket.on('turnStateUpdate', (data: any) => {
      if (data?.boardId !== boardId) {
        return;
      }

      setTurnState({
        mode: data.mode,
        currentTurnPlayerId: data.currentTurnPlayerId,
        turnOrder: data.turnOrder,
      });
      setTurnSecondsLeft(data.mode === 'turn' ? 30 : null);
    });
    socket.on('turnTimedOut', (data: any) => {
      if (data?.boardId !== boardId) {
        return;
      }

      if (String(data.playerId) === String(myFlmId)) {
        setCurrentDiceValue(null);
      }
    });
    socket.on('diceRolled', (data: any) => {

      if (data?.boardId !== boardId) {
        return;
      }

      if (Array.isArray(data?.allPlayersDice)) {
        const incomingDiceRows = normalizeDiceRows(
          data.diceValue || data.allPlayersDice || [],
        );

        setDiceRows(incomingDiceRows);
      }
      if (Array.isArray(data?.updatedPlayers)) {
        setPlayers(prev =>
          prev.map(p => {
            const updated = data.updatedPlayers.find(
              (u: any) => String(u.playerId) === String(p.playerId),
            );

            return updated ? { ...p, ...updated } : p;
          }),
        );
      }
      if (
        data?.loggedInMrStats &&
        String(data.loggedInMrStats.flmId) === String(myFlmId)
      ) {
        setLoggedInMrStats(data.loggedInMrStats);
      }
      if (
        String(data?.teamId) === String(myFlmId) ||
        String(data?.playerId) === String(user?.id)
      ) {
        setCurrentDiceValue(
          data.diceValue == null ? null : Number(data.diceValue),
        );
      }
    });
    socket.on('newDiceValue', (data: any) => {
      if (Array.isArray(data?.diceValues)) {
        setDiceRows(prev => [
          ...prev.filter(
            r => String(r.playerId) !== String(myFlmId) || r.diceValue == null,
          ),
          ...normalizeDiceRows(data.diceValues).map(row => ({
            ...row,
            playerId: String(myFlmId),
          })),
        ]);
      }
    });
    socket.on('diceCleared', (data: any) => {

      if (Array.isArray(data?.allPlayersDice)) {
        const incomingDiceRows = normalizeDiceRows(
          data.diceValue || data.allPlayersDice || [],
        );

        setDiceRows(incomingDiceRows);

        
      }
      if (
        String(data?.teamId) === String(myFlmId) ||
        String(data?.playerId) === String(user?.id)
      ) {
        setCurrentDiceValue(null);
      }
    });
    socket.on('pawnMoved', async (delta: any) => {

      const d = delta?.data;

      if (!d || d.boardId !== boardId) {
        return;
      }
      if (Array.isArray(d.updatedPlayers)) {
        setPlayers(prev =>
          prev.map(p => {
            const updated = d.updatedPlayers.find(
              (u: any) => u.playerId === p.playerId,
            );

            return updated ? { ...p, ...updated } : p;
          }),
        );
      }
      if (d.loggedInMrStats) {
        setLoggedInMrStats(d.loggedInMrStats);
      }
      if (Array.isArray(d.updatedDice)) {
        setDiceRows(prev => {
          const next = [...prev];

          d.updatedDice.forEach((updated: any) => {
            const index = next.findIndex(
              r => String(r.playerId) === String(updated.playerId),
            );

            if (index >= 0) {
              next[index] = {
  ...next[index],
  diceValue: updated.diceValue,
  uploadId:
    updated.id === null || updated.id === undefined
      ? null
      : String(updated.id),
  rolledAt: updated.rolledAt,
};
            }
          });

          return next;
        });
      }
      if (d.updatedPawns?.length) {
        for (const updatedPawn of d.updatedPawns) {
          const oldPawn = pawnsRef.current.find(p => p.id === updatedPawn.id);

          if (!oldPawn) continue;

          animatePawnMovement(oldPawn, updatedPawn, d.movedPawn);
        }
      }
    });
    return () => {

      socket.removeAllListeners();

      socket.disconnect();

      socketRef.current = null;
    };
  }, [boardId, myFlmId, user?.id]);

  useEffect(() => {
    if (turnSecondsLeft === null || turnSecondsLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setTurnSecondsLeft(prev =>
        prev === null ? null : Math.max(prev - 1, 0),
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [turnSecondsLeft]);

  const handleDiceRoll = () => {
    if (!socketRef.current || !boardId) {
      return;
    }

    if (isSelectingDice) {
      return;
    }

    if (currentDiceValue) {
      return;
    }

    setIsSelectingDice(true);
    const rolledValue = Math.floor(Math.random() * 6) + 1;
    socketRef.current.emit(
      'rollDice',
      {
        boardId,
        playerId: myFlmId,
        userId: user?.id,
        diceValue: rolledValue,
        validMoves: true,
      },
      (response: any) => {

        setIsSelectingDice(false);

        if (!response?.ok) {
          showAlert({
            title: 'Dice Error',
            message: response?.msg || 'Failed to roll dice',
            variant: 'error',
            buttons: [{ text: 'OK', style: 'default', onPress: withClose() }],
          });
          return;
        }

        setCurrentDiceValue(Number(response.diceValue ?? rolledValue));
        const dice = Number(response.diceValue ?? rolledValue);

// Get only blue pawns
const bluePawns = pawnsRef.current.filter(
  p => p.color === 'blue',
);

// Pawns outside base
const activeBluePawns = bluePawns.filter(
  p => p.currentPosition && p.currentPosition !== '0',
);

// If only one pawn is outside, move automatically
if (
  activeBluePawns.length === 1 &&
  dice !== 6
) {
  setTimeout(() => {
    handlePawnClick(activeBluePawns[0]);
  }, 500);
}
        if (Array.isArray(response.allPlayersDice)) {
          setDiceRows(normalizeDiceRows(response.allPlayersDice));
        }
        if (Array.isArray(response.updatedPlayers)) {
          setPlayers(prev =>
            prev.map(p => {
              const updated = response.updatedPlayers.find(
                (u: any) => String(u.playerId) === String(p.playerId),
              );

              return updated ? { ...p, ...updated } : p;
            }),
          );
        }
        if (response.loggedInMrStats) {
          setLoggedInMrStats(response.loggedInMrStats);
        }
      },
    );
  };

  const handlePawnClick = (pawn: Pawn) => {
    if (!socketRef.current || !boardId || !currentDiceValue) {
      return;
    }

    socketRef.current.emit(
      'movePawn',
      {
        boardId,
        pawnId: pawn.id,
        playerId: myFlmId,
        userId: user?.id,
        diceValue: currentDiceValue,
      },
      (response: any) => {
        if (!response?.ok) {
          showAlert({
            title: 'Move Error',
            message: response?.msg || 'Failed to move pawn',
            variant: 'error',
            buttons: [{ text: 'OK', style: 'default', onPress: withClose() }],
          });
          return;
        }

        setCurrentDiceValue(null);
      },
    );
  };

  const renderBoardPawns = (): React.ReactElement[] => {
    const posMap = new Map<string, Pawn[]>();

    pawns.forEach(pawn => {
      if (!pawn.currentPosition || pawn.currentPosition === '0') {
        return;
      }

      const perspectiveColor = getPerspectiveColor(pawn.color);

      const grid = positionToGrid(
        pawn.currentPosition === 'finished'
          ? 'finished'
          : getPerspectivePosition(pawn.currentPosition),
        perspectiveColor,
      );

      if (!grid) return;

      const key = `${grid[0]},${grid[1]}`;

      if (!posMap.has(key)) {
        posMap.set(key, []);
      }

      posMap.get(key)!.push(pawn);
    });
    
    const elements: JSX.Element[] = [];

    posMap.forEach((group, key) => {
      const [col, row] = key.split(',').map(Number);

      const pixel = gridToPixel(col, row);
      
      group.forEach((pawn, i) => {
        const offset =
          group.length > 1
            ? (i - (group.length - 1) / 2) * s(5)
            : 0;

        elements.push(
          <TouchableOpacity
  key={`${pawn.id}-${pawn.currentPosition}`}
  activeOpacity={
    pawn.color === 'blue' && currentDiceValue ? 0.8 : 1
  }
  disabled={
    pawn.color !== 'blue' || !currentDiceValue
  }
  onPress={() => {
    if (pawn.color === 'blue') {
      handlePawnClick(pawn);
    }
  }}
            style={[
              styles.boardPawn,
              {
                left: pixel.left + offset,
                top: pixel.top,
              },
            ]}
          >
            <View style={styles.pawnBackplate}>
              <Image
                source={
                  PAWN_IMAGES[
                    getPerspectiveColor(pawn.color)
                  ]
                }
                style={styles.boardPawnImage}
              />
            </View>
          </TouchableOpacity>,
        );
      });
    });
    
    return elements;
  };

  const renderBasePawns = (): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    const basePawnsByColor: Record<string, Pawn[]> = {};
    pawns
      .filter(p => !p.currentPosition || p.currentPosition === '0')
      .forEach(p => {
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
          <TouchableOpacity
  key={`${pawn.id}-${pawn.currentPosition}`}
  activeOpacity={
    pawn.color === 'blue' && currentDiceValue ? 0.8 : 1
  }
  disabled={
    pawn.color !== 'blue' || !currentDiceValue
  }
  onPress={() => {
    if (pawn.color === 'blue') {
      handlePawnClick(pawn);
    }
  }}
            style={[
              styles.boardPawn,
              {
                left: pixel.left,
                top: pixel.top,
              },
            ]}
          >
            <View style={styles.pawnBackplate}>
              <Image
                source={PAWN_IMAGES[getPerspectiveColor(pawn.color)]}
                style={styles.boardPawnImage}
              />
            </View>
          </TouchableOpacity>,
        );
      });
    });
    return elements;
  };

  const renderPlayerNamesOnBoard = (): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    const colorToName: Record<PawnColor, string> = {
      red: '',
      green: '',
      yellow: '',
      blue: '',
    };

    // Map player names to colors
    players.forEach(player => {
      const activePlayer = activePlayers.find(a => a.flmId === player.playerId);

      if (activePlayer) {
        colorToName[
  getPerspectiveColor(player.color)
] = activePlayer.playerName;
      }
    });

    // Red player - top left
    if (colorToName.red) {
      const pos = gridToPixel(0, 0.2);
      elements.push(
        <View
          key="playerName-red"
          style={[styles.playerNameTag, { left: pos.left, top: pos.top }]}
        >
          <Image
            source={require('../assets/gameAssets/pawn-white.png')}
            style={styles.flagIcon}
          />
          <Text style={styles.playerNameText}>{colorToName.red}</Text>
        </View>,
      );
    }

    // Green player - top right
    if (colorToName.green) {
      const pos = gridToPixel(10.5, 0.2);
      elements.push(
        <View
          key="playerName-green"
          style={[styles.playerNameTag, { left: pos.left, top: pos.top }]}
        >
          <Text style={styles.playerNameText}>{colorToName.green}</Text>
          <Image
            source={require('../assets/gameAssets/pawn-white.png')}
            style={styles.flagIcon}
          />
        </View>,
      );
    }

    // Yellow player - bottom right
    if (colorToName.yellow) {
      const pos = gridToPixel(10.5, 14.5);
      elements.push(
        <View
          key="playerName-yellow"
          style={[styles.playerNameTag, { left: pos.left, top: pos.top }]}
        >
          <Text style={styles.playerNameText}>{colorToName.yellow}</Text>
          <Image
            source={require('../assets/gameAssets/pawn-white.png')}
            style={styles.flagIcon}
          />
        </View>,
      );
    }

    // Blue player - bottom left (WITH JOIN LOGIC)
    const handleJoinBlue = async () => {
      if (isFlm) {
  Toast.show({
    type: 'error',
    text2: 'Only MR can join the board',
    position: 'top',
    visibilityTime: 3000,
  });

  return;
}
      try {
        const checkRes = await fetch(
          `${API_BASE_URL}/api/active-player/check`,
          {
            method: 'POST',
            headers: {
              ...authHeaders(session?.token),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              boardId,
              playerId: user?.id,
              flmId: myFlmId,
            }),
          },
        );

        const checkJson = await checkRes.json();

        if (!checkJson?.data?.canPlay) {
          showAlert({
            title: 'Cannot Join',
            message: checkJson?.data?.message || 'Player already active',
            variant: 'error',
            buttons: [{ text: 'OK', style: 'default', onPress: withClose() }],
          });
          return;
          return;
        }

        showAlert({
          title: 'Join Game',
          message: 'Do you want to join this room as Blue team?',
          variant: 'confirm',
          buttons: [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: withClose(),
            },
            {
              text: 'Join',
              style: 'default',
              onPress: withClose(async () => {
                socketRef.current?.emit(
                  'joinGameAsActive',
                  {
                    boardId,
                    playerId: myFlmId,
                    userId: user?.id,
                  },
                  async (response: any) => {
                    if (!response?.ok) {
                      showAlert({
                        title: 'Cannot Join',
                        message: response?.msg || 'Failed to join game',
                        variant: 'error',
                        buttons: [{ text: 'OK', style: 'default', onPress: withClose() }],
                      });
                      return;
                    }

                    await fetchBoardState(boardId!);
                    if (response?.data?.turnState) {
                      setTurnState(response.data.turnState);
                    }
                    if (response?.data?.loggedInMrStats) {
                      setLoggedInMrStats(response.data.loggedInMrStats);
                    }
                    socketRef.current?.emit('joinGame', {
                      boardId,
                      playerId: myFlmId,
                      userId: user?.id,
                    });
                  },
                );
              }),
            },
          ],
        });
      } catch (err) {
        // console.log('join error', err);
      }
    };

    const pos = gridToPixel(0, 14.5);

    const bluePlayerExists = !!blueActivePlayer;
    // console.log('bluePlayerExists', bluePlayerExists);
    elements.push(
      <TouchableOpacity
        activeOpacity={bluePlayerExists ? 1 : 0.8}
        key="playerName-blue"
        onPress={() => {
          // console.log('Blue clicked');

          if (!bluePlayerExists) {
            handleJoinBlue();
          }
        }}
        style={[
          styles.playerNameTag,
          {
            left: pos.left,
            top: pos.top,
            backgroundColor: !bluePlayerExists
              ? 'rgba(255,255,255,0.15)'
              : 'transparent',
            borderRadius: s(8),
            paddingHorizontal: s(8),
          },
        ]}
      >
        <Image
          source={require('../assets/gameAssets/pawn-white.png')}
          style={styles.flagIcon}
        />

        <Text style={styles.playerNameText}>
          {bluePlayerExists ? blueActivePlayer?.playerName : 'Await Player'}
        </Text>
      </TouchableOpacity>,
    );

    return elements;
  };

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
 const getPlayerByColor = (perspectiveColor: PawnColor) => {
  return players.find(
    p => getPerspectiveColor(p.color) === perspectiveColor,
  );
};

  const renderTeamCard = (
    player: Player | undefined,
    positionStyle: any,
    reverse?: boolean,
  ) => {
    if (!player) return null;
// const perspectiveColor = getPerspectiveColor(player.color);
    const diceRow =
  [...diceRows]
    .reverse()
    .find(
      (r: DiceByPlayerRow) =>
        String(r.playerId) === String(player.playerId) &&
        r.diceValue != null,
    ) || null;

 const diceValue =
  diceRow?.diceValue == null
    ? null
    : Number(diceRow.diceValue);

    // Default dice face when no dice is available yet
    const diceValueForUI = diceValue == null ? 1 : diceValue;

    const logo = getTeamLogo(player.teamName);
    const lastMovedAt = player.lastMovedAt ?? null;

    return (
      <View
  style={[
    styles.diceboard,
    positionStyle,
  ]}
>
        {reverse && (
            <View
            style={{
              right: s(8),
              alignSelf: 'center',
              width: '24%',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: s(29),
            }}
          >
            <Text style={styles.lastMovedText}>
              {lastMovedAt
                ? new Date(lastMovedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—'}
            </Text>
            {DICE_IMAGE_BY_VALUE[diceValueForUI] ? (
              (() => {
  return (
    <Image
      source={DICE_IMAGE_BY_VALUE[diceValueForUI]}
      style={{
        width: s(28),
        height: s(28),
        resizeMode: 'contain',
      }}
    />
  );
})()
            ) : (
              <Text style={styles.fallbackDiceText}>No Dice</Text>
            )}
            {logo ? (
              <Image
                source={logo}
                style={[
                  styles.teamLogoImg, // optional positioning
                ]}
                resizeMode="contain"
              />
            ) : null}
          </View>
        )}

        {!reverse && (
          <View
            style={{
              left: s(0),
              // bottom: s(4),
              alignSelf: 'center',
              width: '24%',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: s(29),
            }}
          >
            {logo ? (
              <Image
                source={logo}
                style={[
                  styles.teamLogoImg,
                  // optional positioning
                ]}
                resizeMode="contain"
              />
            ) : null}
            {DICE_IMAGE_BY_VALUE[diceValueForUI] ? (
              (() => {
                // const DiceComponent = DICE_IMAGE_BY_VALUE[diceValueForUI];

               return (
  <Image
    source={DICE_IMAGE_BY_VALUE[diceValueForUI]}
    style={{
      width: s(28),
      height: s(28),
      resizeMode: 'contain',
    }}
  />
);
              })()
            ) : (
              <Text style={styles.fallbackDiceText}>No Dice</Text>
            )}
            <Text style={styles.lastMovedText}>
              {lastMovedAt
                ? new Date(lastMovedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—'}
            </Text>
          </View>
        )}
      </View>
    );
  };
  const redPlayer = getPlayerByColor('red');
const greenPlayer = getPlayerByColor('green');
const yellowPlayer = getPlayerByColor('yellow');
const bluePlayerData = getPlayerByColor('blue');

const blueActivePlayer = activePlayers.find(
  p => String(p.flmId) === String(bluePlayerData?.playerId),
);

  const bluePlayerExists = !!blueActivePlayer;

const bluePlayer = bluePlayerData;
const blueDiceBalance =
  loggedInMrStats?.currentDiceRollBalance ?? 0;
const blueUserMoves = loggedInMrStats?.mrBoardMoves ?? 0;
const blueUserHearts = loggedInMrStats?.currentHeartBalance ?? 0;
const isMyTurn =
  !turnState ||
  turnState.mode !== 'turn' ||
  String(turnState.currentTurnPlayerId) === String(myFlmId);
const canRollBlueDice =
  bluePlayerExists &&
  !isFlm &&
  isMyTurn &&
  !currentDiceValue &&
  blueDiceBalance > 0 &&
  !isSelectingDice;
  return (
    <SafeAreaView style={styles.container}>
      <View>
        {/* TOP: TEAMS GRID */}
        <View style={styles.teamsContainer}>
          {players.map((player, index) => {
            const diceIcon =
              player.color === 'red'
                ? require('../assets/gameAssets/dice-red.png')
                : player.color === 'green'
                ? require('../assets/gameAssets/dice-green.png')
                : player.color === 'yellow'
                ? require('../assets/gameAssets/dice-yellow.png')
                : require('../assets/gameAssets/dice-blue.png');

            return (
              <View key={player.playerId} style={styles.teamCard}>
                <View style={styles.teamNumberCircle}>
                  <Text style={styles.teamNumberText}>
                    {player.rank ?? index + 1}
                  </Text>
                </View>

                <View style={styles.compactStatsContainer}>
                  <View style={styles.compactRow}>
                    <Text style={styles.teamTitle} numberOfLines={2}>
                      {(player.teamName || player.playerName).replace(
                        /([a-z])([A-Z])/g,
                        '$1\n$2',
                      )}
                    </Text>
                    <View style={[styles.compactItem,{right:s(1)}]}>
                      <Image
                        source={require('../assets/gameAssets/move-gain.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>{player.moves}</Text>
                    </View>

                    <View style={[styles.compactItem,{left:s(0)}]}>
                      <Image
                        source={require('../assets/gameAssets/moves.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>{player.moves}</Text>
                    </View>
                  </View>

                  <View style={styles.compactRow}>
                    <View style={styles.compactItem}>
                      <Image
                        source={require('../assets/gameAssets/kill.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>{player.kills}</Text>
                    </View>

                    <View style={[styles.compactItem,{left:s(6)}]}>
                      <Image
                        source={require('../assets/gameAssets/heart.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>
                        {player.hearts ?? 0}
                      </Text>
                    </View>

                    <View style={[styles.compactItem, { left: s(16) }]}>
                      <Image
                        source={require('../assets/gameAssets/move-loss.png')}
                        style={styles.compactIcon}
                      />
                      <Text style={styles.compactText}>
                        {player.movesLost ?? 0}
                      </Text>
                    </View>
                    <View style={[styles.compactItem, { left: s(18) }]}>
                      <Image source={diceIcon} style={styles.compactIcon} />
                      <Text style={styles.compactText}>
                        {player.currentDiceRollBalance}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* TOP - RED */}
        <View style={styles.dice}>
          {renderTeamCard(
            redPlayer,
            {
              left: s(-2),
              borderBottomEndRadius: s(0),
              borderBottomStartRadius: s(0),
            },
            false,
          )}
        </View>

        {/* RIGHT - GREEN */}
        <View style={styles.dice}>
          {renderTeamCard(
            greenPlayer,
            {
              right: s(-2),
              borderBottomEndRadius: s(0),
              borderBottomStartRadius: s(0),
            },
            true,
          )}
        </View>

        {/* BOTTOM RIGHT - YELLOW */}
        <View style={{}}>
          {renderTeamCard(
            yellowPlayer,
            {
              right: s(-2),
              top: BOARD_SIZE + s(30),
              borderTopEndRadius: s(0),
              borderTopStartRadius: s(0),
              position: 'absolute',
              left: s(205),
              width: '44%',
            },
            true,
          )}
        </View>

        {/* CENTER: LUDO BOARD SECTION */}
        <View style={styles.boardContainer}>
          <Image
            source={require('../assets/gameAssets/ludo-board.png')}
            style={styles.boardImage}
          />


          {/* BOARD VALUE MARKERS */}
          {[
            { value: '-1', positions: [[3, 8], [6, 3], [11, 6], [8, 11]] },
            { value: '-6', positions: [[0, 7], [7, 0], [14, 7], [7, 14]] },
            { value: '-3', positions: [[5, 6], [8, 5], [9, 8], [6, 9]] },
          ].flatMap(item =>
            item.positions.map(([col, row], index) => (
              <View
                key={`${item.value}-${col}-${row}-${index}`}
                style={[
                  styles.boardMarker,
                  {
                    left: GRID_LEFT + col * TILE_W,
                    top: GRID_TOP + row * TILE_H,
                    width: TILE_W,
                    height: TILE_H,
                  },
                ]}
              >
                <Text style={styles.boardMarkerText}>
                  {item.value}
                </Text>
              </View>
            )),
          )}


          <View style={styles.pawnLayer}>
            {renderPlayerNamesOnBoard()}
            {renderBasePawns()}
            {renderBoardPawns()}
          </View>
        </View>
      </View>

      <TouchableOpacity
  style={styles.fab}
  onPress={() => {
    setShowChat(true);
  }}
>
  <Icon
    name="forum"
    size={s(24)}
    color="#fffdfd"
  />
</TouchableOpacity>
      <View
        style={{
          position: 'relative',
          width: '47%',
          height: s(94),
          backgroundColor: '#d9d9d9',
          marginHorizontal: '3%',
          left: s(2),
          borderWidth: 2,
          borderColor: '#fff',
          borderBottomLeftRadius: s(8),
          borderBottomRightRadius: s(8),
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: s(8),
          overflow: 'visible',
          top: s(30),
        }}
      >
        {/* LEFT INFO */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          {bluePlayer ? (
            <>
              {/* TEAM LOGO */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  top: s(4),
                }}
              >
                <Image
                  source={getTeamLogo(bluePlayer?.teamName)}
                  style={{
                    width: s(40),
                    height: s(40),
                    resizeMode: 'contain',
                    marginRight: s(6),
                    // bottom: s(6),
                    marginTop:s(4)
                  }}
                />
              </View>

              {/* MOVES */}
              <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: s(10),
                }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: s(2),
                }}
              >
                <Image
                  source={require('../assets/gameAssets/moves.png')}
                  style={{
                    width: s(18),
                    height: s(18),
                    resizeMode: 'contain',
                    marginRight: s(4),
                  }}
                />

                <Text
                  style={{
                    fontSize: s(16),
                    fontWeight: '800',
                    color: '#000',
                  }}
                >
                  {blueUserMoves}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: s(4),
                }}
              >
                <Image
                  source={require('../assets/gameAssets/heart.png')}
                  style={{
                    width: s(18),
                    height: s(18),
                    resizeMode: 'contain',
                    marginRight: s(4),
                  }}
                />

                <Text
                  style={{
                    fontSize: s(16),
                    fontWeight: '800',
                    color: '#000',
                  }}
                >
                  {blueUserHearts}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: s(4),
                }}
              >
                <Image
                  source={require('../assets/gameAssets/dice-blue.png')}
                  style={{
                    width: s(18),
                    height: s(18),
                    resizeMode: 'contain',
                    marginRight: s(4),
                  }}
                />

                <Text
                  style={{
                    fontSize: s(16),
                    fontWeight: '800',
                    color: '#000',
                  }}
                >
                  {blueDiceBalance}
                </Text>
              </View>
              </View>
              <View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    // marginTop: s(2),
  }}
>
  <Text
    style={{
      fontSize: s(11),
      color: '#444',
      fontWeight: '600',
    }}
  >
    {bluePlayer?.lastMovedAt
      ? new Date(
          bluePlayer.lastMovedAt,
        ).toLocaleDateString(
          'en-GB',
          {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          },
        )
      : '—'}
  </Text>
</View>
            </>
          ) : (
            <View
              style={{
                justifyContent: 'center',
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontSize: s(12),
                  color: '#262626',
                  fontWeight: '600',
                }}
              >
                Player Awaiting
              </Text>

            </View>
          )}
        </View>
{/* RIGHT: one big dice */}
{(() => {
  const diceValue = currentDiceValue || 1;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        flex: 1,
        gap: s(8),
        paddingTop: s(4),
      }}
    >
      <TouchableOpacity
        activeOpacity={canRollBlueDice ? 0.8 : 1}
        disabled={!canRollBlueDice}
        onPress={handleDiceRoll}
      >
        <Image
  source={DICE_IMAGE_BY_VALUE[diceValue]}
  style={{
    width: 54,
    height: 54,
    resizeMode: 'contain',
    opacity: currentDiceValue || canRollBlueDice ? 1 : 0.45,
  }}
/>
      </TouchableOpacity>
      {turnState?.mode === 'turn' && (
        <Text
          style={{
            position: 'absolute',
            top: s(56),
            right: s(2),
            fontSize: s(10),
            color: isMyTurn ? '#111' : '#777',
            fontWeight: '800',
          }}
        >
          {isMyTurn && turnSecondsLeft !== null
            ? `${turnSecondsLeft}s`
            : 'WAIT'}
        </Text>
      )}
    </View>
  );
})()}
        </View>
      <View
        style={{
          position: 'relative',
          left: s(210),
          bottom: s(0),
        }}
      >
        <Text style={{ color: 'white' }}>
          Starting date:
          {boardData?.startTime
            ? new Date(boardData.startTime).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '--'}
        </Text>

        <Text style={{ color: 'white' }}>
          Ending date:
          {boardData?.endTime
            ? new Date(boardData.endTime).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '--'}
        </Text>
      </View>
      <Chat
        visible={showChat}
        onClose={() => setShowChat(false)}
        boardId={boardId}
        playerId={myFlmId || ''}
        playerName={user?.name || 'Player'}
        teamName={bluePlayer?.teamName || ''}
        userId={user?.id}
      />

      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        variant={alertVariant}
        buttons={alertButtons}
        onRequestClose={closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    boardMarker: {
  position: 'absolute',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 20,
},

boardMarkerText: {
  color: 'red',
  fontSize: s(12),
  fontWeight: '900',
},
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  dice: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: '4%',
    // minHeight: BOARD_SIZE + s(120),
  },
  diceboard: {
    position: 'absolute',
    backgroundColor: '#c8c8c8',
    width: '49%',
    height: s(40),
    borderTopLeftRadius: s(6),
    borderTopRightRadius: s(6),
    borderBottomEndRadius: s(4),
    borderBottomStartRadius: s(4),

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'space-between', // change this
    paddingHorizontal: s(8), // add this

    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 20,
  },

  teamLogoImg: {
    width: s(38),
    height: s(38),
    alignSelf: 'center',
  },
  lastMovedText: {
    fontSize: s(11),
    color: '#444',
    fontWeight: '600',
    // top: s(5),
  },

  fallbackDiceText: {
    width: s(28),
    fontSize: s(12),
    color: '#444',
    fontWeight: '800',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(12),
  },

  loadingText: {
    color: '#FFF',
    fontSize: s(14),
    fontWeight: '600',
  },

  // ─── TOP: TEAMS GRID ───
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
    backgroundColor: '#e1e1e1',
    borderRadius: s(10),
    borderWidth: 3,
    borderColor: '#979797',
    paddingHorizontal: s(10),
    paddingTop: s(14),
    paddingBottom: s(10),
    minHeight: s(40),
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

  compactStatsContainer: {
    // Keeps the top team card layout aligned with otherBoard.
  },

  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
  },

  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingLeft: s(2),
    gap: s(2),

  },

  compactIcon: {
    width: s(20),
    height: s(20),
    resizeMode: 'contain',
  },

  compactText: {
    color: '#000',
    fontSize: s(11),
    fontWeight: '800',
  },

  teamTitle: {
    width: '50%',
    color: '#000',
    fontSize: s(13),
    fontWeight: '800',
    textAlign: 'left',
  },

  // ─── CENTER: BOARD ───
  boardContainer: {
    top: s(36),
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    alignSelf: 'center',
    position: 'relative',
    // marginVertical: s(8),
    borderRadius: s(4),
    overflow: 'hidden',
    backgroundColor: '#030303',
  },

  boardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
  },

  pawnLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 100,
    elevation: 100,
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

  boardPawnImage: {
    width: '110%',
    height: '110%',
    resizeMode: 'contain',
  },
  fab: {
    position: 'absolute',
    right: s(26),
    bottom: s(0),
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    backgroundColor: '#8c32ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: s(4),
    shadowOffset: { width: 0, height: s(2) },
    zIndex: 100,
  },

  playerNameTag: {
    flexDirection: 'row',
    position: 'absolute',
    // paddingHorizontal: s(8),
    paddingVertical: s(4),
    minWidth: s(60),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: s(3),
    shadowOffset: { width: 0, height: s(2) },
    elevation: 8,
  },

  playerNameText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: s(10),
    textAlign: 'center',
  },
  flagIcon: {
    width: s(16),
    height: s(16),
    resizeMode: 'contain',
  },
});
