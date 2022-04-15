# Privacy Policy
## Collected data
Form Fox collects some of your data. In order to function, these are the things that are collected and stored indefinitely:
- Anything you provide to the bot through commands. This primarily includes form details and configuration data
- Anything sent or selected as an answer to a form's questions
- Discord-provided server, user, channel, message, and role IDs, as part of indexing roles, handling responses, and managing configurations
- Daily backups of the above

## Storage and access
Data is stored using PostgreSQL on a secure and private server. The data is only accessible by the developers of the bot; no one else has been given access.

## Usage
Data collected by the bot is used in a few ways:
### Server IDs
Server IDs are used to differentiate forms and responses across servers, as well as to store server-specific configuration.

### User IDs
User IDs are used to differentiate responses between users in a server.

### Role IDs
Role IDs are stored to keep track of roles that are managed by the bot, ie. roles that can be assigned to users in relation to forms.

### Channel and message IDs
Channel and message IDs are used to remember where forms have been posted, and to handle reactions/interactions with them accordingly. 
Channel IDs are also used to keep track of response-related tickets, remember where to send responses, and keep track of open (in-progress) responses.

### Text provided through commands
Some data may be stored through commands, such as information relating to forms. This is used to differentiate and customize forms, or to set configuration options.

### Text provided in responses
Your answers are stored as part of the response object, so that they can be called up again by server owners if needed.
No message metadata is stored outside of content given to answer questions. **If a response is cancelled, no content will be stored**.

## Removing data
Most data can easily be deleted by using the proper command to delete it. Note that this will not remove data from any existing backups of it, and that it is still possible to lose access to some data by leaving servers or removing the bot from your server.  
If you would like inaccessible data deleted, feel free to contact us using the information below.

## Contact
If desired, you can contact us at (GS)#6969 on Discord or [join the support server](https://discord.gg/EvDmXGt) to ask us to remove any other data. This is also where we can be contacted about privacy concerns if necessary.
