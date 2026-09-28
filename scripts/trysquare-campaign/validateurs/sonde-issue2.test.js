// Sonde de notation de l'issue #2 : l'extraction de `brickHit(ball, bricks)`.
//
// Du matériau de mesure, jamais injecté dans une cellule : aucun agent ne lit ce
// fichier. Il est déposé dans une copie de l'arbre mesuré, hors du clone, à la
// place des tests de l'agent, et lancé par la commande du dépôt.
//
// L'import est **une liaison de module entière** et non une liste de noms. Un
// agent qui n'a pas créé `brickHit` ferait échouer la liaison d'un import nommé,
// et les quatre groupes se tairaient ensemble - y compris celui qui porte le
// critère, qui n'a pourtant besoin que de `frame()`. Avec la liaison entière,
// `neon.brickHit` vaut `undefined` et seuls les groupes qui en dépendent
// noircissent.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as neon from './neon.js';

// `frame()` dessine : elle a besoin d'un contexte, pas d'un canvas. Les méthodes
// sont vides parce que ce qui est mesuré ici est l'effet sur l'état, jamais le
// pixel.
const contexte = () => ({
  fillStyle: '',
  font: '',
  fillRect() {},
  beginPath() {},
  arc() {},
  fill() {},
  fillText() {},
});

// La grille réelle du dépôt. offsetX vaut 4, une brique fait 72 de large et les
// colonnes sont espacées de 80 : la colonne 0 occupe [4, 76] et la colonne 1
// [84, 156]. Une balle de rayon 7 centrée en x = 80 déborde donc des deux, et
// d'elles seules. La rangée 0 occupe [48, 68], et la rangée 1 commence à 76,
// hors d'atteinte d'une balle centrée en y = 58.
const RECOUVRE_DEUX = { x: 80, y: 58 };
const RECOUVRE_UNE = { x: 40, y: 58 };
const RECOUVRE_RIEN = { x: 320, y: 400 };

function etat(position) {
  const state = neon.createState(1);
  state.ball.x = position.x;
  state.ball.y = position.y;
  return state;
}

const vivantes = (bricks) => bricks.filter((brick) => brick.alive).length;

describe('extraction', () => {
  test('brickHit est exporté', () => {
    assert.equal(typeof neon.brickHit, 'function', 'game/neon.js n\'exporte pas brickHit');
  });

  test('brickHit prend la balle et les briques', () => {
    assert.equal(typeof neon.brickHit, 'function', 'brickHit absent');
    assert.equal(neon.brickHit.length, 2, `brickHit déclare ${neon.brickHit.length} paramètre(s) au lieu de 2`);
  });
});

describe('purete', () => {
  test('rend les briques vivantes que la balle recouvre', () => {
    assert.equal(typeof neon.brickHit, 'function', 'brickHit absent');
    const state = etat(RECOUVRE_DEUX);
    const touchees = neon.brickHit(state.ball, state.bricks);
    assert.ok(Array.isArray(touchees), 'brickHit ne rend pas un tableau');
    assert.equal(touchees.length, 2, `${touchees.length} brique(s) rendue(s) au lieu de 2`);
  });

  test('ne mute ni les briques ni la balle', () => {
    assert.equal(typeof neon.brickHit, 'function', 'brickHit absent');
    const state = etat(RECOUVRE_DEUX);
    const avant = vivantes(state.bricks);
    const balle = { ...state.ball };

    neon.brickHit(state.ball, state.bricks);

    assert.equal(vivantes(state.bricks), avant, 'brickHit a tué une brique : elle n\'est pas pure');
    assert.deepEqual({ ...state.ball }, balle, 'brickHit a modifié la balle');
    assert.equal(state.combo, 0, 'brickHit a touché au combo');
    assert.equal(state.score, 0, 'brickHit a touché au score');
  });

  test('ignore une brique déjà morte', () => {
    assert.equal(typeof neon.brickHit, 'function', 'brickHit absent');
    const state = etat(RECOUVRE_DEUX);
    const touchees = neon.brickHit(state.ball, state.bricks);
    // Le message doit nommer la réponse de l'agent et non la fixture : sans cette
    // garde, un brickHit qui rend une brique au lieu d'un tableau fait échouer ce
    // cas sur « la fixture est fausse », ce qui envoie déboguer le harnais.
    assert.ok(Array.isArray(touchees), 'brickHit ne rend pas un tableau');
    const premiere = touchees[0];
    assert.ok(premiere, 'aucune brique recouverte : la fixture est fausse');

    premiere.alive = false;
    const restantes = neon.brickHit(state.ball, state.bricks);

    assert.equal(restantes.length, 1, `${restantes.length} brique(s) rendue(s) au lieu de 1`);
    assert.ok(!restantes.includes(premiere), 'une brique morte est rendue comme touchée');
  });
});

// Le critère. C'est le comportement qu'une extraction rate en silence : six
// exécutions de ce ticket ont rendu trois signatures, dont une qui ne cassait
// plus qu'une brique par frame sans qu'aucun test du dépôt ne rougisse.
describe('multi_briques', () => {
  test('deux briques recouvertes meurent dans la même frame', () => {
    const state = etat(RECOUVRE_DEUX);
    const avant = vivantes(state.bricks);

    neon.frame(contexte(), state);

    const mortes = avant - vivantes(state.bricks);
    assert.equal(mortes, 2, `${mortes} brique(s) cassée(s) dans la frame au lieu de 2`);
  });

  test('et chacune incrémente le combo', () => {
    const state = etat(RECOUVRE_DEUX);

    neon.frame(contexte(), state);

    assert.equal(state.combo, 2, `combo ${state.combo} au lieu de 2 pour deux briques`);
    assert.ok(state.score > 0, 'aucun point pour deux briques cassées');
  });
});

describe('frame_inchange', () => {
  test('une seule brique recouverte meurt, combo à 1', () => {
    const state = etat(RECOUVRE_UNE);
    const avant = vivantes(state.bricks);

    neon.frame(contexte(), state);

    assert.equal(avant - vivantes(state.bricks), 1, 'une balle sur une seule brique n\'en casse pas exactement une');
    assert.equal(state.combo, 1, `combo ${state.combo} au lieu de 1`);
  });

  test('sans recouvrement, rien ne casse', () => {
    const state = etat(RECOUVRE_RIEN);
    const avant = vivantes(state.bricks);

    neon.frame(contexte(), state);

    assert.equal(vivantes(state.bricks), avant, 'une brique est morte sans être touchée');
    assert.equal(state.combo, 0, `combo ${state.combo} au lieu de 0`);
  });
});
