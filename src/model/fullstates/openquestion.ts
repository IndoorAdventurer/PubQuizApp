import yesOrThrow from "../../utils/yesorthrow.js";
import OQAnsweringStage from "../constituentstates/oqansweringstage.js";
import QuestionData from "../constituentstates/questiondata.js";
import Game from "../game.js";


/**
 * Encapsulates an open question. Here a player can type in whatever, and then
 * the admin will have to check the answers. As a result, it exists out of 3
 * game states:
 * 1) The state where a player can answer the question;
 * 2) The state where the admin checks the answers;
 * 3) The state where points get rewarded.
 */
export default class OpenQuestion extends OQAnsweringStage {

    constructor(parent_game: Game, config: { [key: string]: any }) {
        const qdat = new QuestionData(
            yesOrThrow(config, "correct_answer"),
            yesOrThrow(config, "case_sensitive")
        );
        
        super(parent_game, config, qdat);
    }
}