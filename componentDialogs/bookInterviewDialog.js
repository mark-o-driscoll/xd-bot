const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');

const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt, ChoiceFactory } = require('botbuilder-dialogs');

const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const XDCODE_PROMPT = 'XDCODE_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
let endDialog = '';

class BookInterviewDialog extends ComponentDialog {
    constructor(conservsationState, userState) {
        super('bookInterviewDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new TextPrompt(XDCODE_PROMPT, this.xdCodeExistsValidator));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.noOfParticipantsValidator));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this), // Ask confirmation if user wants to book interview?
            this.getXdCode.bind(this), // Get user id (call to db to see if it matches?)
            // this.getNumberOfParticipants.bind(this), // Number of participants for reservation
            // this.getDate.bind(this), // Date of reservation
            // this.getTime.bind(this), // Time of reservation
            this.pickInterviewDate.bind(this),
            this.pickInterviewTime.bind(this),
            this.confirmStep.bind(this), // Show summary of values entered by user and ask confirmation to book interview
            this.summaryStep.bind(this)

        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(step) {
        endDialog = false;
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return await step.prompt(CONFIRM_PROMPT, 'Would you like to book an interview slot?', ['yes', 'no']);
    }

    async getXdCode(step) {
        // yes or no returns result as true/false
        if (step.result) {
            return await step.prompt(XDCODE_PROMPT, 'Please Enter Your XD activation code');
        } else {
            endDialog = true;
            return await step.endDialog();
        }
    }

    // async getNumberOfParticipants(step) {
    //     step.values.xdCode = step.result;
    //     return await step.prompt(NUMBER_PROMPT, 'How many participants ( 1 - 150)?');
    // }

    // async getDate(step) {
    //     // result contains all applicant data returned from XD
    //     step.values.xdDetails = step.result;
    //     console.log(step.result);
    //     return await step.prompt(DATETIME_PROMPT, `Welcome ${ step.values.xdDetails.name }. On which date do you want to book the interview for the job: '${ step.values.xdDetails.job }'?`);
    // }

    // async getTime(step) {
    //     step.values.date = step.result;

    //     return await step.prompt(DATETIME_PROMPT, 'At what time?');
    // }

    async pickInterviewDate(step) {
        // result contains all applicant data returned from XD
        step.values.xdDetails = step.result;
        console.log(step.result);
        const testDates = ['01/05/2021', '01/06/2021', '01/07/2021'];
        return await step.prompt(CHOICE_PROMPT, {
            choices: ChoiceFactory.toChoices(testDates),
            prompt: `Hey ${ step.values.xdDetails.name }. On which date do you want to book an interview for the job: '${ step.values.xdDetails.job }'?`
        });
    }

    async pickInterviewTime(step) {
        step.values.date = step.result.value;
        console.log(step.result);
        // These times would be retrieved from the DB
        const testTimes = ['11:00', '12:15', '13.30', '14.45', '15.30'];
        return await step.prompt(CHOICE_PROMPT, {
            choices: ChoiceFactory.toChoices(testTimes),
            prompt: `On ${ step.values.date } we have the following interview time slots available:`
        });
    }

    async confirmStep(step) {
        step.values.time = step.result.value;

        const msg = `Interview Booking Details. \n\n Name: ${ step.values.xdDetails.name } \n\n XD Code: ${ step.values.xdDetails.xdCode }\n\n Date: ${ step.values.date }\n\n Date: ${ step.values.time }`;

        await step.context.sendActivity(msg);

        return await step.prompt(CONFIRM_PROMPT, 'Are you sure that all values are correct and you want to book this interview slot?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result) {
            // Business
            await step.context.sendActivity('Interview successfully booked. Your interview id is : 12345678');
            endDialog = true;
            return await step.endDialog();
        } else {
            await step.context.sendActivity('Interview Booking process cancelled!');
            endDialog = true;
            return await step.endDialog();
        }
    }

    // async noOfParticipantsValidator(promptContext) {
    // // This condition is our validation rule. You can also change the value at this point.
    //     return promptContext.recognized.succeeded && promptContext.recognized.value > 1 && promptContext.recognized.value < 150;
    // }

    /**
     * Check xdCode against Azure DB? If it matches then proceed.
     */
    async xdCodeExistsValidator(promptContext) {
        // example of data returned from DB
        const testData = [{
            xdCode: '1010',
            name: 'Mark O\'Driscoll',
            job: 'Software Developer'
        }, {
            xdCode: '2020',
            name: 'Adam Ricken',
            job: 'Team Lead'
        }];
        // check if xdcode exists and get linked applicant
        console.log(promptContext.recognized.value);
        const userIndex = testData.findIndex((user) => user.xdCode === promptContext.recognized.value);
        console.log(userIndex);
        const xdCodeExists = promptContext.recognized.succeeded && userIndex !== -1;
        if (xdCodeExists) promptContext.recognized.value = testData[userIndex];
        return xdCodeExists;
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.BookInterviewDialog = BookInterviewDialog;
