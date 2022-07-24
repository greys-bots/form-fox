# Form Fox
*A form and application bot for Discord*

Form Fox, or just Fox, is our take on a Disord application bot. They handle everything from the creation of forms to adding roles when responses get accepted.

The bot's default prefix is `ff!`, and you can get help with anything you need with `ff!h`.

## Getting Started
You can invite Form Fox with [this link](https://discord.com/oauth2/authorize?client_id=737192331241062462&permissions=268561472&scope=bot). Once you've got the bot in your server, you should:
- Create a form with `ff!create`
- Post that form to a channel with `ff!post`, or bind it to an existing message with `ff!bind`
- Set a response channel globally or local to that form with `ff!channel`
- React to the post from before, or use `ff!apply` to open a response
- Finish the response to make sure everything's working

You're all set! The bot should now function properly.

## Features
### Several question types
Form Fox currently offers several different types of questions, specifically:
- Multiple choice
- Checkbox-style
- Freeform
- Numbers-only
- Date-only

You can also make questions required, which will prevent users from skipping them (or completing a form early, if there are more required questions ahead)

### Reaction-based interaction
Most of Form Fox's functions are reaction based, or have reaction-based options- mainly applying to forms and accepting/denying responses. This saves on typing and helps keep your channels safer and cleaner, as it erases the need for new members to have a writable channel in order to apply to enter your server.  
*Note: For accessibility reasons, reaction-based interactions also come with command or keyword equivalents. No need to worry about missing out on a feature just because its primary intent is for reactions!*

### Multiple forms per server
Servers currently do not have a limit to the number of forms they can create. Whether you only need one, or could use 10, you have the ability to make whatever forms you need.  
*Note: Despite this, forms can currently only have 20 questions. This is due to Discord-related limitations, but in the future this may be worked around and upped as necessary.*

### Individual form customization
Every form is its own contained app. They have their own names, descriptions, even colors- and on top of this, you can also set what channel their responses go to, what roles are given once the form's response is accepted, and what message is sent to the user if their form is accepted. You can customize just about every aspect of each form.

### Easy to use syntax
Most commands come with shorter aliases for ease of typing. Form and response creation are also handled as menus, so you don't have to worry about getting things mixed up.

### No time limit for responses
In-progress responses are saved for easy access later. Respond whenever you want; there's no time limit before you have to start over again.  
This also applies to bot restarts. Your data will be saved as soon as you answer a question, and will be accessed again when you answer another one. No more losing responses because of bot crashes.

## Self hosting
### Requirements
**Node:** version 14.0 or higher  
**Database:** For the master branch: PostgreSQL with any version, local or otherwise; for sqlite branch: SQLite 3  
**Tech:** You'll want some form of hosting computer, be it a VPS in the cloud or a computer that's always online. **This bot isn't likely to work with REPL.**  
You should also have a basic understanding of Node, Postgres, and JavaScript, especially if you plan to make changes.

### Steps
(Assuming you have all the requirements set up)
1. Download this repository and unzip (if applicable) to wherever you want it
2. Open a terminal in the root folder and use `npm i` to install dependencies
3. Copy the `.env.example` rename it to `.env`. Fill it with the correct values
4. Use `node bot/bot` to run the bot

The bot should now be online and accepting commands :)

## Support and Links
[support server](https://discord.gg/EvDmXGt)  
[our patreon](https://patreon.com/greysdawn)  
[our ko-fi](https://ko-fi.com/greysdawn)

### Commissions
We do commissions! If you're interested in a bot or website, check out [this doc](https://docs.google.com/document/d/1hvqvqdWj0mpHeNjo_mr2AHF7La32nkp4BDLxO1dvTHw/edit?usp=drivesdk) for more info!
