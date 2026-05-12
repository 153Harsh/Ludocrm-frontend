import React, { useEffect, useRef, useState, useCallback, JSX } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, authHeaders } from '../api';
import { useAuth } from '../auth/AuthContext';
import DiceOne from '../assets/dice-six-faces-one.svg';
import DiceTwo from '../assets/dice-six-faces-two.svg';
import DiceThree from '../assets/dice-six-faces-three.svg';
import DiceFour from '../assets/dice-six-faces-four.svg';
import DiceFive from '../assets/dice-six-faces-five.svg';
import DiceSix from '../assets/dice-six-faces-six.svg';

const { width: W, height: H } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;
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

// Board track constants
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

const HOME_AREA_BY_COLOR: Record<string, number> = {
  blue: 1,
  red: 2,
  green: 3,
  yellow: 4,
};
const COLOR_BY_HOME_AREA: Record<number, string> = {
  1: 'blue',
  2: 'red',
  3: 'green',
  4: 'yellow',
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

const COLOR_ACCENT: Record<string, string> = {
  red: '#e32425',
  green: '#0fba53',
  yellow: '#ff8a00',
  blue: '#1179cf',
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
}
type DiceByPlayerRow = {
  playerId: string;
  diceValue: number | null;
  rolledAt?: string | null;
};

const DICE_IMAGE_BY_VALUE: Record<number, any> = {
  1: DiceOne,
  2: DiceTwo,
  3: DiceThree,
  4: DiceFour,
  5: DiceFive,
  6: DiceSix,
};

const PAWN_IMAGES = {
  red: require('../assets/gameAssets/pawn-red.png'),
  green: require('../assets/gameAssets/pawn-green.png'),
  yellow: require('../assets/gameAssets/pawn-yellow.png'),
  blue: require('../assets/gameAssets/pawn-blue.png'),
};

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
  const [connected, setConnected] = useState(false);

  // Keep all dice rows from backend so we can render dice + image per team/player
  const [diceRows, setDiceRows] = useState<DiceByPlayerRow[]>([]);
  const myPlayerIdForDice = isFlm ? myFlmId : user?.id;

  const [myDice, setMyDice] = useState<number | null>(null);

  // Upcoming (pre-approved) dice values (max 3) for the left info panel
  const [unplayedDiceValues, setUnplayedDiceValues] = useState<number[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const creatorId = 'S1101';
  const myPlayerColor = players.find(p => p.playerId === myFlmId)?.color;
  const myPlayer = players.find(p => p.playerId === myFlmId);

  const pawnsRef = useRef<Pawn[]>([]);
  const [boardData, setBoardData] = useState<any>(null);

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
      await fetchBoardState(activeBoard.id);
    } catch (e) {
      console.warn('fetchBoard error:', e);
    } finally {
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

      const incomingDiceRows = (json.data.diceValue || []).map((d: any) => ({
        playerId: String(d.playerId),
        diceValue:
          d.diceValue === null || d.diceValue === undefined
            ? null
            : Number(d.diceValue),
        rolledAt: d.rolledAt ?? null,
      })) as DiceByPlayerRow[];

      setDiceRows(incomingDiceRows);

      // unplayedDiceValue might come from backend as part of loaded dice rows.
      // We use it only to show upcoming dice (max 3) in the LEFT info panel.
      const unplayed = (json.data?.unplayedDiceValue ?? json.data?.unplayedDiceValues ?? null) as
        | number
        | number[]
        | null;

      const normalizedUnplayed =
        unplayed == null
          ? []
          : Array.isArray(unplayed)
            ? unplayed
            : [unplayed];

      setUnplayedDiceValues(normalizedUnplayed.filter((n): n is number => typeof n === 'number').slice(0, 3));

      const myDiceRow = incomingDiceRows.find(
        r => String(r.playerId) === String(myPlayerIdForDice),
      );
      setMyDice(myDiceRow?.diceValue ?? null);
    } catch (e) {
      console.warn('fetchBoardState error:', e);
    }
  };

  const sleep = (ms: number) =>
    new Promise<void>(resolve => setTimeout(() => resolve(), ms));

  const animatePawnMovement = async (oldPawn: Pawn, newPawn: Pawn) => {
    const posInfo = (pos: string) => {
      const normal = pos.match(/cell-area-(\d+)-id-(\d+)/);
      if (normal)
        return { type: 'cell', area: Number(normal[1]), id: Number(normal[2]) };
      const home = pos.match(/home-area-(\d+)-id-(\d+)/);
      if (home)
        return { type: 'home', area: Number(home[1]), id: Number(home[2]) };
      return null;
    };

    setPawns(prev => prev.map(p => (p.id === newPawn.id ? newPawn : p)));
  };

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

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
        playerId: myFlmId,
        userId: user?.id,
        isSpectator: false 
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Player joined the game
    socket.on('playerJoined', (data: any) => {
      if (data?.boardId !== boardId) return;
      console.log('Player joined:', data);
      
      // Refresh board state to get updated player list
      if (boardId) {
        fetchBoardState(boardId);
      }
    });

    // Player left the game
    socket.on('activePlayerLeft', (data: any) => {
      if (data?.boardId !== boardId) return;
      console.log('Player left:', data);
      // Refresh board state
      if (boardId) {
        fetchBoardState(boardId);
      }
    });

    // Dice was rolled
    socket.on('diceRolled', (data: any) => {
      if (data?.boardId !== boardId) return;
      console.log('Dice rolled:', data);
      
      // Update players with new stats
      if (data?.updatedPlayers?.length) {
        setPlayers(prev => {
          return prev.map(existingPlayer => {
            const updatedPlayer = data.updatedPlayers.find(
              (p: Player) => p.playerId === existingPlayer.playerId,
            );
            if (!updatedPlayer) return existingPlayer;
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
              lastMovedAt:
                updatedPlayer.lastMovedAt ?? existingPlayer.lastMovedAt,
            };
          });
        });
      }

      // Update dice values
      if (data?.allPlayersDice?.length) {
        const incomingDiceRows = data.allPlayersDice.map((d: any) => ({
          playerId: String(d.playerId),
          diceValue:
            d.diceValue === null || d.diceValue === undefined
              ? null
              : Number(d.diceValue),
          rolledAt: d.rolledAt ?? null,
        })) as DiceByPlayerRow[];

        setDiceRows(incomingDiceRows);

        const myRow = incomingDiceRows.find(
          r => String(r.playerId) === String(myPlayerIdForDice),
        );
        if (myRow !== undefined) {
          setMyDice(myRow?.diceValue ?? null);
        }
      }
    });

    // Player started rolling dice
    socket.on('playerStartedRolling', (data: any) => {
      if (data?.boardId !== boardId) return;
      console.log('Player started rolling:', data.playerId);
    });

    socket.on('pawnMoved', async (delta: any) => {
      const d = delta?.data;
      if (!d || d.boardId !== boardId) return;
      if (d.updatedPawns?.length) {
        for (const updatedPawn of d.updatedPawns) {
          const oldPawn = pawnsRef.current.find(p => p.id === updatedPawn.id);
          if (!oldPawn) continue;
          await animatePawnMovement(oldPawn, updatedPawn);
        }
      }
      if (d.updatedPlayers?.length) {
        setPlayers(prev => {
          return prev.map(existingPlayer => {
            const updatedPlayer = d.updatedPlayers.find(
              (p: Player) => p.playerId === existingPlayer.playerId,
            );
            if (!updatedPlayer) return existingPlayer;
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
              lastMovedAt:
                updatedPlayer.lastMovedAt ?? existingPlayer.lastMovedAt,
            };
          });
        });
      }
      if (d.updatedDice?.length) {
        const incomingDiceRows = d.updatedDice.map((r: any) => ({
          playerId: String(r.playerId),
          diceValue:
            r.diceValue === null || r.diceValue === undefined
              ? null
              : Number(r.diceValue),
          rolledAt: r.rolledAt ?? null,
        })) as DiceByPlayerRow[];

        setDiceRows(incomingDiceRows);

        const myRow = incomingDiceRows.find(
          r => String(r.playerId) === String(myPlayerIdForDice),
        );
        if (myRow !== undefined) {
          setMyDice(myRow?.diceValue ?? null);
        }
      }
    });

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
  }, [boardId, isFlm, myFlmId, user?.id]);

  const renderBoardPawns = (): React.ReactElement[] => {
    const posMap = new Map<string, Pawn[]>();
    pawns.forEach(pawn => {
      if (!pawn.currentPosition || pawn.currentPosition === '0') return;
      const grid = positionToGrid(pawn.currentPosition, pawn.color);
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
                source={PAWN_IMAGES[pawn.color]}
                style={styles.boardPawnImage}
              />
            </View>
          </View>,
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
        if (!basePawnsByColor[p.color]) basePawnsByColor[p.color] = [];
        basePawnsByColor[p.color].push(p);
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
                source={PAWN_IMAGES[pawn.color]}
                style={styles.boardPawnImage}
              />
            </View>
          </View>,
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
      colorToName[player.color] = player.playerName;
    });

    // Red player - top left
    if (colorToName.red) {
      const pos = gridToPixel(0,0.2);
      elements.push(
        <View
          key="playerName-red"
          style={[
            styles.playerNameTag,
            { left: pos.left, top: pos.top },
          ]}
        >
          <Image source={require('../assets/gameAssets/pawn-white.png')} style={styles.flagIcon} />
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
          style={[
            styles.playerNameTag,
            { left: pos.left, top: pos.top,},
          ]}
        >
          <Text style={styles.playerNameText}>{colorToName.green}</Text>
          <Image source={require('../assets/gameAssets/pawn-white.png')} style={styles.flagIcon} />
        </View>,
      );
    }

    // Yellow player - bottom right
    if (colorToName.yellow) {
      const pos = gridToPixel(10.5, 14.5);
      elements.push(
        <View
          key="playerName-yellow"
          style={[
            styles.playerNameTag,
            { left: pos.left, top: pos.top},
          ]}
        >
          <Text style={styles.playerNameText}>{colorToName.yellow}</Text>
          <Image source={require('../assets/gameAssets/pawn-white.png')} style={styles.flagIcon} />
        </View>,
      );
    }

    // Blue player - bottom left (WITH JOIN LOGIC)
    const handleJoinBlue = () => {
      Alert.alert(
        'Join Game',
        'Do you want to join this room as Blue team?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Join',
            onPress: async () => {
              try {
                // Emit socket event to notify backend
                socketRef.current?.emit('playerJoined', {
                  boardId,
                  playerId: myFlmId,
                  userId: user?.id,
                  playerName: user?.name || 'Joined Player',
                  role: user?.role,
                });

                // Refresh board state to confirm join from backend
                setTimeout(() => {
                  if (boardId) {
                    fetchBoardState(boardId);
                  }
                }, 1000);
              } catch (error) {
                console.error('Error joining blue team:', error);
              }
            },
          },
        ],
      );
    };

    const pos = gridToPixel(0, 14.5);
    const bluePlayerExists = colorToName.blue; // Check if blue player exists in players array

    elements.push(
      <TouchableOpacity
        activeOpacity={bluePlayerExists ? 1 : 0.8}
        key="playerName-blue"
        onPress={() => {
          // Only show popup if no player joined
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
        ]}>
        
        <Image
          source={require('../assets/gameAssets/pawn-white.png')}
          style={styles.flagIcon}
        />

        <Text style={styles.playerNameText}>
          {bluePlayerExists ? colorToName.blue : 'Await Player'}
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
  const getPlayerByColor = (color: PawnColor) => {
    return players.find(p => p.color === color);
  };

  const renderTeamCard = (
    player: Player | undefined,
    positionStyle: any,
    reverse?: boolean,
  ) => {
    if (!player) return null;

    const diceRow = diceRows.find(
      r => String(r.playerId) === String(player.playerId),
    );

    const diceValue = diceRow?.diceValue ?? null;
    const logo = getTeamLogo(player.teamName);
    const lastMovedAt = player.lastMovedAt ?? null;

    return (
      <View style={[styles.diceboard, positionStyle]}>
        {reverse && (
          <View
            style={{
              right: s(8),
              // bottom: s(4),
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
            {diceValue != null && DICE_IMAGE_BY_VALUE[diceValue] ? (
              (() => {
                const DiceComponent = DICE_IMAGE_BY_VALUE[diceValue];

                return <DiceComponent width={s(28)} height={s(28)} />;
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
            {diceValue != null && DICE_IMAGE_BY_VALUE[diceValue] ? (
              (() => {
                const DiceComponent = DICE_IMAGE_BY_VALUE[diceValue];

                return <DiceComponent width={s(28)} height={s(28)} />;
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
  const bluePlayer = getPlayerByColor('blue');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: s(140),
        }}
      >
        {/* TOP: TEAMS GRID */}
        <View style={styles.teamsGrid}>
          {players.map((player, index) => (
            <TouchableOpacity
              key={player.playerId}
              style={[
                styles.teamCard,
                player.playerId === myFlmId && styles.teamCardActive,
              ]}
              onPress={() => setSelectedTeam(player.playerId as any)}
            >
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {player.teamName || player.playerName}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Image
                    source={require('../assets/gameAssets/kill.png')}
                    style={styles.statIcon}
                  />
                  <Text style={styles.statText}>{player.kills}</Text>
                </View>
                <View style={styles.statItem}>
                  <Image
                    source={require('../assets/gameAssets/moves.png')}
                    style={styles.statIcon}
                  />
                  <Text style={styles.statText}>{player.moves}</Text>
                </View>
              </View>
              {player.playerId === myFlmId && (
                <View style={styles.badgeLabel}>
                  <Text style={styles.badgeText}>YOU</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
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

        {/* BOTTOM LEFT - BLUE
<View style={styles.dice}>
  {renderTeamCard(
    bluePlayer,
    {
      left: s(-2),
      top: BOARD_SIZE + s(32),
      borderTopEndRadius: s(0),
      borderTopStartRadius: s(0),
    },
    false,
  )}
</View> */}

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
          <View pointerEvents="none" style={styles.pawnLayer}>
            {renderPlayerNamesOnBoard()}
            {renderBasePawns()}
            {renderBoardPawns()}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Icon name="forum" size={s(24)} color="#fff" />
      </TouchableOpacity>
      <View
        style={{
          position: 'relative',
          width: '47%',
          height: s(78),
          backgroundColor: '#d9d9d9',
          marginHorizontal: '3%',
          left: s(2),
          borderWidth: 2,
          borderColor: '#fff',
          borderBottomLeftRadius: s(8),
          borderBottomRightRadius: s(8),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: s(8),
          overflow: 'hidden',
          bottom: s(52),
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
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  top: s(4),
                }}
              >
                <Image
                  source={getTeamLogo(bluePlayer?.teamName)}
                  style={{
                    width: s(32),
                    height: s(32),
                    resizeMode: 'contain',
                    marginRight: s(6),
                    bottom: s(6),
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
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
                  {bluePlayer?.moves}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: s(2), right: s(2) }}>
                {unplayedDiceValues.length ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {unplayedDiceValues.slice(0, 3).map((val, idx) => {
                      const DiceComponent = DICE_IMAGE_BY_VALUE[val];
                      if (!DiceComponent) return null;
                      return (
                        <View
                          key={`${val}-${idx}`}
                          style={{
                            marginLeft: idx === 0 ? 0 : s(4),
                          }}
                        >
                          <DiceComponent width={s(24)} height={s(24)} />
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: s(12),
                      color: '#262626',
                      fontWeight: '600',
                    }}
                  >
                    No upcoming dice
                  </Text>
                )}
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
              <Text
                style={{
                  fontSize: s(12),
                  color: '#262626',
                  marginTop: s(4),
                }}
              >
                No upcoming
              </Text>
            </View>
          )}
        </View>

        {/* DICE */}
        {bluePlayer ? (
          (() => {
            const diceValue = diceRows.find(
              r => String(r.playerId) === String(bluePlayer?.playerId),
            )?.diceValue;
            
            if (diceValue != null && DICE_IMAGE_BY_VALUE[diceValue]) {
              const DiceComponent = DICE_IMAGE_BY_VALUE[diceValue];
              return <DiceComponent width={s(36)} height={s(36)} />;
            }
            return <Text style={{ fontSize: s(14), color: '#444', fontWeight: '800' }}>No Dice</Text>;
          })()
        ) : (
          <Text
            style={{
              fontSize: s(12),
              color: '#262626',
              fontWeight: '600',
            }}
          >
            No dice
          </Text>
        )}
      </View>
      <View
        style={{
          position: 'relative',
          left: s(220),
          bottom: s(80),
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: s(10),
    marginTop: s(10),
    marginBottom: s(12),
    gap: s(8),
  },

  teamCard: {
    width: '48%',
    height: s(60),
    backgroundColor: '#e0e0e0',
    borderRadius: s(8),
    borderWidth: 3,
    borderColor: '#ffffff',
    paddingHorizontal: s(10),
    paddingVertical: s(10),
    alignItems: 'center',
  },

  teamCardActive: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },

  numberBadge: {
    width: s(22),
    height: s(22),
    borderRadius: s(12),
    backgroundColor: '#ffc107',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: s(6),
    bottom: s(20),
    borderWidth: 1,
    borderColor: '#9b7400',
  },

  numberText: {
    color: '#9b7400',
    fontWeight: '900',
    fontSize: s(12),
  },

  teamName: {
    width: '35%',
    color: '#8a8a8a',
    fontSize: s(12),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: s(6),
    minHeight: s(24),
    bottom: s(22),
    right: s(55),
    lineHeight: s(14),
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: s(6),
    position: 'absolute',
    top: s(18),
    left: s(90),
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(3),
  },

  statIcon: {
    width: s(24),
    height: s(24),
    resizeMode: 'contain',
  },

  statText: {
    color: '#434343',
    fontWeight: '700',
    fontSize: s(16),
  },

  badgeLabel: {
    backgroundColor: '#2563eb',
    paddingHorizontal: s(6),
    paddingVertical: s(2),
    borderRadius: s(4),
  },

  badgeText: {
    color: '#000000',
    fontSize: s(8),
    fontWeight: '700',
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
    zIndex: 30,
    elevation: 50,
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
    bottom: s(80),
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
  }
});
