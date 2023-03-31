
/**
 * The main class managing all the data for a game. Most notably, it
 * maintains a list of players (see `Player` class), as well as a list of
 * upcomming rounds/questions. In addition, it should forward many function
 * calls directly to a `GameState`, as these have all the responsibilites of
 * making the game go forward.
 */
export default class Game {

    static readonly START_SCORE = 60;

    private state_sequence: GameState[] = [];       // i.e. questions; see below
    private players = new Map<string, Player>();    // stores all players

    /**
     * TODO should get folder as input, such that it can loop over the dirs
     * and find all levels.
     */
    constructor() {
        // TODO!
    }


    //---STUFF-FOR-GAME-STATES:-------------------------------------------------

    /**
     * Moves the game to the next state/question.
     */
    public nextStateManip(): void {
        if (this.state_sequence.length !== 0)
            return;

        this.state_sequence.shift().end_active();
        this.state_sequence[0].begin_active();
    }


    //---STUFF-FOR-PLAYERS:-----------------------------------------------------

    /**
     * Adds a new player to the game. Ideally done before the first round ofc
     * @param name The name of the player. Should be unique. Else gets padded
     * with Xs till it is unique
     */
    public addPlayer(name: string): void {

        // Unique name:
        while (this.players.has(name))
            name += "X";

        // Add to map, with name as key.
        this.players.set(name, { score: Game.START_SCORE, isplaying: true });
    }

    /**
     * Removes the specified player
     * @param idx 
     */
    public removePlayer(name: string): void {
        if (!this.players.has(name)) {
            console.warn(`Player "${name}" does not exist. Ignoring`);
            return;
        }

        this.players.delete(name);
    }

    /**
     * @returns The number of Players registered
     */
    public numberOfPlayers(): number {
        return this.players.size;
    }

    /**
     * @returns All the names of players
     */
    public getAllPlayerNames(): Set<string> {
        return new Set(this.players.keys());
    }

    /**
     * @returns Array of objects containing all player data. Sorted in desceding
     * order of score
     */
    public playerDataDump(): { name: string, score: number, isplaying: boolean }[] {
        // Get it as a list:
        const data = Array.from(this.players.entries())
            .map(([name, fields]) => ({ name, ...fields }));

        // Sort in descending order based on score:
        data.sort((a, b) => b.score - a.score);

        return data;
    }


    /**
     * Updates the scores of all players
     * @param map A `Map<string, number>` where keys are player names, and
     * values are values to add to the corresponding player its score. Make sure
     * all players specified in map actually exist!
     */
    public addToScores(map: Map<string, number>): void {
        // Iterate over map and update all values
        for (const [name, score] of map.entries()) {
            const player = this.players.get(name);
            if (player)
                player.score += score;
            else
                console.warn("Tried updating non existing Player. Ignoring");
        }
    }

    /**
     * Getter method for retrieving the score field for a Player given a name
     * @param name The name of the player to retrieve the score from 
     * @returns The retrieved score
     */
    public getScore(name: string): number | undefined {
        const player = this.players.get(name);
        return player?.score;
    }

    /**
     * Getter method for retrieving the isplaying field for a Player given a key
     * @param name The name of the player to retrieve the `isplaying` state from 
     * @returns The `isplaying` state: a boolean that specifies if the player
     * is still part of the playing people, or if he/she lost and is now going
     * for the consolation price.
     */
    public isPlaying(name: string): boolean | undefined {
        const player = this.players.get(name);
        return player?.isplaying;
    }

    /**
     * Setter method for setting the score field for a Player given a key
     * @param name The name of the player: key to retrieve player with
     * @param score The new score for this player.
     */
    public setScore(name: string, score: number): void {
        const player = this.players.get(name);
        if (player)
            player.score = score;
        else
            console.warn("Setter called for player that does not exist!");
    }

    /**
     * Setter method for setting the isplaying field for a Player given a key
     * @param name The name of the player: key to retrieve player with
     * @param isplaying A boolean stating if the player is still in game or not
     */
    public setIsPlaying(name: string, isplaying: boolean): void {
        const player = this.players.get(name);
        if (player)
            player.isplaying = isplaying;
        else
            console.warn("Setter called for player that does not exist!");
    }
}


/**
 * Represents a certain state of the game. For example, a specific question, or
 * a specific round. Even the pre-game state where people can log in should be
 * derived from this class. Gets access to the relevant internals of the `Game`
 * class, as it is responsible for manipulating these. For example, a question
 * is itself responsible for updating the points of individual players.
 */
export abstract class GameState {

    protected parent_game: Game;

    constructor(parent_game: Game) {
        this.parent_game = parent_game;
    }

    /**
     * Gets called when `Game` hands control over to this object, such that it
     * gets notified it is in charge now. It can, for example, set things up
     * to start a timer that makes the player's points tick away, or make sure
     * the players will see the appropriate screen, etc.
     */
    public begin_active(): void { }

    /**
     * Gets called when `Game` hands control over to the next `GameState`
     */
    public end_active(): void { }


    static updatesGame(): MethodDecorator {
        return  function(   target: Object,
                            key: string | symbol,
                            descriptor: PropertyDescriptor) {
            const of = descriptor.value;
            descriptor.value = function( ... args: any[]) {
                console.warn("TODO: make it call this.parent_game.update() or something!");
                const gm = <Game>this.parent_game;
                console.log(`for now, to see we can access the parent: `, gm.numberOfPlayers());
                return of.apply(this, args);
            }

            return descriptor;
        }
    }

}


/**
 * Represent a player in the game. Manages its data, such as score, etc.
 */
interface Player {
    score: number,          // The players score
    isplaying: boolean      // At some point, only the top-n players will keep
    // playing, while the left-over ones will compete  for the consolation price
}