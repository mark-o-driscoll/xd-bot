// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { BookInterviewDialog } = require('./componentDialogs/bookInterviewDialog');

class XDBOT extends ActivityHandler {
    constructor(conversationState, userState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty('dialogState');
        this.bookInterviewDialog = new BookInterviewDialog(this.conversationState, this.userState);

        this.previousIntent = this.conversationState.createProperty('previousIntent');
        this.conversationData = this.conversationState.createProperty('conservationData');

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            await this.dispatchToIntentAsync(context);

            await next();
        });

        this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });
        this.onMembersAdded(async (context, next) => {
            await this.sendWelcomeMessage(context);
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;

        // Iterate over all new members added to the conversation.
        for (const idx in activity.membersAdded) {
            if (activity.membersAdded[idx].id !== activity.recipient.id) {
                // user = ${ activity.membersAdded[idx].name }
                const welcomeMessage = 'Welcome to Xd Recruitment Bot!';
                await turnContext.sendActivity(welcomeMessage);
                await this.sendSuggestedActions(turnContext);
            }
        }
    }

    async sendSuggestedActions(turnContext) {
        var reply = MessageFactory.suggestedActions(['Book Interview Slot', 'Contact HR', 'Get Office Location'], 'What would you like to do today ?');
        await turnContext.sendActivity(reply);
    }

    async dispatchToIntentAsync(context) {
        let currentIntent = '';
        const previousIntent = await this.previousIntent.get(context, {});
        const conversationData = await this.conversationData.get(context, {});

        if (previousIntent.intentName && conversationData.endDialog === false) {
            currentIntent = previousIntent.intentName;
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            currentIntent = context.activity.text;
        } else {
            currentIntent = context.activity.text;
            await this.previousIntent.set(context, { intentName: context.activity.text });
        }
        switch (currentIntent) {
        case 'Book Interview Slot':
            console.log('Inside Book Interview Slot Case');
            await this.conversationData.set(context, { endDialog: false });
            await this.bookInterviewDialog.run(context, this.dialogState);
            conversationData.endDialog = await this.bookInterviewDialog.isDialogComplete();
            if (conversationData.endDialog) {
                // set previous intent?..
                await this.sendSuggestedActions(context);
            }
            break;
        case 'Get Office Location':
            await context.sendActivity('Our Office is located in Ballincollig, Co. Cork.');
            break;
        case 'Contact HR':
            await context.sendActivity('You can contact HR here: hr@corehr.com');
            break;
        default:
            console.log('Did not match Make Reservation case');
            await this.sendSuggestedActions(context);
            break;
        }
    }
}

module.exports.XDBOT = XDBOT;