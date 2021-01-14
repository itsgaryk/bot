//Filesystem required for reading and writing files
const fs = require('fs');

const Discord = require('discord.js');
const {prefix, token} = require('./config.json');
const client = new Discord.Client();

//loading command files
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
/*
for (const file of commandFiles) {
    const command = require("./commands/${file}");
}
*/

client.login(token);
client.once('ready', () => {
    console.log('Locked and loaded!')    
});

client.on('guildCreate', guild => {
    newConfig(guild.id.toString())
})

//Event - On Promise ready
client.on('ready', () => {
    client.user.setStatus("Online");
    client.user.setActivity("!help for commands", {type: "LISTENING"});
})

//Event - Status change to voice channels
client.on('voiceStateUpdate', (oldState, newState) => {
    
    const serverConfig = JSON.parse(fs.readFileSync(`json/${newState.guild.id}.json`));

    console.log("New Channel state: ",newState.channelID, "\tOld Channel: ", oldState.channelID);

    //Ignores dev channel if client is main bot
    if(((newState.channelID == "798573191936081961" && oldState.channelID == null) || (!newState.channelID && oldState.channelID == "798573191936081961")) && client.user.id == "793011221581660190") return;

    //Ignores all other channels if client is dev bot
    if(((newState.channelID != "798573191936081961" && oldState.channelID == null) || (!newState.channelID && oldState.channelID != "798573191936081961")) && client.user.id == "795940893709959178") return;

    console.log("test");

    if (newState.channelID && !newState.member.roles.cache.find(r => r.id == `${serverConfig.voice}`)){
        console.log("adding role");
        newState.member.roles.add(`${serverConfig.voice}`)
        return;
    }

    if (newState.channelID == null) {
        console.log("removing role");
        newState.member.roles.remove(`${serverConfig.voice}`);
        return;
    }
    debugger;
});

//Event - When a message has been sent
client.on('message', message => {

    //Variables
    const guildId = message.guild.id.toString();
    const guildOwner  = message.guild.owner.user.id.toString();
    const memberRoles = message.member.roles.cache

    //Loads audio file names from server folder
    //const commandFiles = fs.readdirSync('./audio/${guildId}/').filter(file => file.endsWith('.mp3'));


    //Loads server config file. Creates new if it doesn't already exist.
    let serverConfig;
    try { serverConfig = JSON.parse(fs.readFileSync(`json/${guildId}.json`)); }
    catch(err){
        console.log(`config file for server ${guildId} does not exist. Creating a new one`)
        newConfig(guildId);
        return;
    }

    //Checks if bot sent the message
    if (message.author.bot) return;

    //Commands
    else if(message.content.startsWith(prefix)) {
            
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift();

        switch (command) {
            case "test":
                if(message.author.id != guildOwner) return;
                //if (message.guild.channels.cache.find(r => r.id == ("798573191936081961"))) console.log("found the channel");
                //if (client.token.search("Nzkz")) console.log("Found the token!")

                //console.log ("Roles Map: " + message.member.roles.cache);
                //console.log(`Hello ${guildId} welcome back`)

                //console.log (serverConfig)
                //console.log ("Roles IDs: " + message.member.roles.cache.map(r => `${r.id}`));
                //console.log ("Roles Names: " + message.member.roles.cache.map(r => `${r.name}`));
                console.log(!hasMod(serverConfig.modRoles, memberRoles), message.author.id != guildOwner)

                console.log(serverConfig.secretRooms)

                console.log(serverConfig.triggers[0].triggerWord)
                console.log(serverConfig.triggers.map(r => r.triggerWord))
                //console.log(serverConfig.triggers.getJSONArray(r => r.triggerWord))
                if(message.member.roles.cache.find(r => r.id == serverConfig.memberRoles))
                    console.log("confirmed");
                return;
            case "help":
                message.channel.send("Available Commands\n\n" + "!help - Lists all available commands\n" + 
                "!mod [add/remove] [role] - Manage your mods (mod only)\n" + 
                "!hint - Gives you a hint for the number\n" + 
                "!room [add/remove] [channel] - Manage your secret rooms (mod only)\n" +
                "!trigger [add/remove] [word] [URL] - Manage your trigger words (remove is mod only)\n" +
                "!triggers - displays all available triggers");
                return;
            case "hint":
                message.channel.send(hintNumber(serverConfig.guessNumber));
                return;      
            case "mod":
                if(!hasMod(serverConfig.modRoles, memberRoles || message.author.id != guildOwner)){
                    message.channel.send("Error: you don't have permission to perform that command.")
                    return;
                }
                if(args[0] === undefined || args[1] === undefined){
                    message.channel.send("Error: missing arguments e.g. !room add #general");
                    return;
                }
                
                let argMod = args[1].replace(/[^\w\s]/gi, '');

                if (!message.guild.roles.cache.find(r => r.id == `${argMod}`)){
                    message.channel.send("Error: invalid Role ID. Please submit a valid role");
                    return;
                }

                switch(args[0]){
                    case "add":
                        if(serverConfig.modRoles.find(r => r == `${argMod}`)){
                            message.channel.send(`Error: channel <@&${argMod}> is already added`);
                            return;
                        }
                        serverConfig.modRoles.push(`${argMod}`);
                        message.channel.send(`Role <@&${argMod}> has successfully been added`);
                        updateConfig(serverConfig,guildId);
                        return;
                    case "remove":
                        if(serverConfig.modRoles.find(r => r == `${argMod}`)){
                            serverConfig.modRoles = serverConfig.modRoles.filter(r => r != `${argMod}`);
                            message.channel.send(`Role <#${argMod}> has successfully been removed`);
                            updateConfig(serverConfig,guildId);
                            return;
                        }
                        else{
                            message.channel.send("Channel is not on the list")
                            return;
                        }
                    default:
                        message.channel.send("Error: invalid argument after room [add/remove] e.g. !room add #general")
                        return;  
                }
            case "room":
                if(!hasMod(serverConfig.modRoles, memberRoles || message.author.id != guildOwner)){
                    message.channel.send("Error: you don't have permission to perform that command.")
                    return;
                }
                if(args[0] === undefined || args[1] === undefined){
                        message.channel.send("Error: missing arguments e.g. !room add #general");
                        return;
                }
                
                let argRoom = args[1].replace(/[^\w\s]/gi, '');

                if (!message.guild.channels.cache.find(r => r.id == `${argRoom}`)){
                    message.channel.send("Error: invalid Channel ID. Please submit a valid channel");
                    return;
                }

                switch(args[0]){
                    case "add":
                        if(serverConfig.secretRooms.find(r => r == `${argRoom}`)){
                            message.channel.send(`Error: channel <#${argRoom}> is already added`);
                            return;
                        }
                        serverConfig.secretRooms.push(`${argRoom}`);
                        message.channel.send(`Channel <#${argRoom}> has successfully been added`);
                        updateConfig(serverConfig,guildId);
                        return;
                    case "remove":
                        if(serverConfig.secretRooms.find(r => r == `${argRoom}`)){
                            serverConfig.secretRooms = serverConfig.secretRooms.filter(r => r != `${argRoom}`);
                            message.channel.send(`Channel <#${argRoom}> has successfully been removed`);
                            updateConfig(serverConfig,guildId);
                            return;
                        }
                        else{
                            message.channel.send("Channel is not on the list")
                            return;
                        }
                    case Number:
                        //this will add a channel for the tagged user if one doesn't already exist for the user
                    default:
                        message.channel.send("Error: invalid argument after room [add/remove] e.g. !room add #general")
                        return; 
                }        
            case "rooms":
                if(serverConfig.triggers.length != 0){
                    //message.channel.send("All channels as secret rooms\n```", getArray(serverConfig.secretRooms) , "```");
                    let roomList = sortArray(serverConfig.secretRooms);
                    message.channel.send("All channels as secret rooms\n```" + roomList.join("  ") + "```");
                    return;
                }
            case "trigger":
                if(args[0] === undefined || args[1] === undefined){
                    message.channel.send("Error: missing arguments e.g. !trigger add funny https://website.com/image.jpg");
                    return;
                }
                if(hasSpecialCharaters(args[1])){
                    message.channel.send("Error: trigger word cannot contain special characters");
                    return;
                }
                if(isNumber(args[1])){
                    message.channel.send("Error: trigger word cannot be a number (you can mix alphanumeric values)");
                    return;
                }

                let triggerWord = args[1].toLowerCase();
                let triggerLink = args[2];

                switch (args[0]){
                    case "add":
                        let url;
                        try{
                            url = new URL(args[2])
                        }
                        catch (_) {
                            message.channel.send("Error: invalid URL e.g. https://www.website.com/image.jpg")
                            return;
                        }
                        
                        let urlSplit = args[2].split(".");
                        let validTypes = ["bmp", "jpg", "png", "jpeg", "gif"];
                        if (!validateURL(urlSplit, validTypes)){
                            message.channel.send("Error: must provide direct link to image e.g. https://www.website.com/image.jpg")
                            return;
                        }

                        if(!serverConfig.triggers.find(r => r.triggerWord == `${triggerWord}`)) {
                            serverConfig.triggers.push({"triggerWord":`${triggerWord}`,"triggerLink":`${triggerLink}`});
                            //serverConfig.triggers[serverConfig.triggers.length] = {"triggerWord":`${triggerWord}`,"triggerLink":`${triggerLink}`};
                            message.channel.send(`Trigger **${triggerWord}** successfully added`);
                            updateConfig(serverConfig, guildId);
                            return;
                        }
                        else{
                            message.channel.send(`Trigger **${triggerWord}** already exists`);
                            return;
                        }
                    case "remove":
                        if(serverConfig.triggers.find(r => r.triggerWord == `${triggerWord}`)) {
                            serverConfig.triggers = serverConfig.triggers.filter(r => r.triggerWord != `${args[1]}`);
                            message.channel.send(`Trigger **${triggerWord}** successfully removed`);
                            updateConfig(serverConfig, guildId);
                            return;
                        }
                        else{
                            message.channel.send("Error: trigger word **${triggerWord}** does not exist")
                            return;
                        }                    
                    default:
                        message.channel.send("Error: invalid arguments e.g. !trigger add meme https://www.website.com/meme.jpg")
                        return;
                }
            case "triggers":
                if(serverConfig.triggers.length == 0){
                    message.channel.send("No triggers have been added to the server")
                    return;
                }
                else{
                    let TriggerWords = sortArray(serverConfig.triggers.map(r => r.triggerWord));
                    message.channel.send("Available triggers\n```" + TriggerWords.join("  ") + "```");
                    return;
                }
            default:
                message.channel.send("Error: invalid command. See !help for a list of available commands");    
                return;
        }
    }
    //Triggers
    else if (!message.content.startsWith(prefix) && !isNumber(message.content)) {
        let args = message.content.toLowerCase().split(" ");
        for(i = 0; i < args.length; i++) {
            for (j = 0; j < serverConfig.triggers.length; j++) {
                if (args[i] === serverConfig.triggers[j].triggerWord){
                    message.channel.send({files: [serverConfig.triggers[j].triggerLink]});
                    return;
                }
            }
        }
    }

    //Number guessing
    else if(isNumber(message.content) && serverConfig.secretRooms.find(r => r == `${message.channel.id}`)) {
        switch(checkNumber(message.content, serverConfig.guessNumber)){
            case 1:
                message.channel.send("You guessed the right number. Congratulations!");
                serverConfig.guessNumber = serverConfig.guessNumber = newNumber();
                console.log(`Number guessed on ${guildId}. New number is ${serverConfig.guessNumber}`);
                updateConfig(serverConfig, guildId);
                break;
            case 2:
                message.channel.send("Getting warmer!");
                return;                
            default:
                message.channel.send("You guessed the wrong number. Try again!");
                return;
        }
    }
})

//General functions

//n = serverConfig, o = GuildID
function newConfig(n){
    let serverConfig = {"guessNumber": newNumber(),"secretRooms": [],"modRoles": [], "triggers":[{}], "voice": ""};
    fs.writeFileSync(`json/${n}.json`, JSON.stringify(serverConfig, null, 2));
}

function updateConfig(n,o){
        fs.writeFileSync(`json/${o}.json`, JSON.stringify(n, null, 2));
        console.log(`Updated config file for server ${o}`);
}

function isNumber(n){
    return !isNaN(parseInt(n));
}

function hasSpecialCharaters(n){
    const specialCharacters = /[^a-zA-Z0-9\-\/]/;
    if(specialCharacters.test(n)) return true;
    else return false;
}

function xOr(n,o){
    if ((n || o) || (!n || o)) return true;
    return false;
}

//Object functions
function hasMod(n,o){
    if (o.length == 0) return false;
    for(i = 0; i < o.length; i++){
        if (n.roles.cache.find(r => r.id == o[i])) return true;
    }
    return false;
}

//Object functions
function hasMod(n,o,p){
    if (o.length == 0) return false;
    if (n.id == p) return true;
    for(i = 0; i < o.length; i++){
        if (n.roles.cache.find(r => r.id == o[i])) return true;
    }
    return false;
}

//Array functions
function sortArray(n){
    if(n == 0) return;
    return n.sort(function(a, b){
        if(a < b) { return -1; }
        if(a > b) { return 1; }
        return 0;
    })
}

//Trigger functions
function validateURL(n, o){
    for(i=0; i < o.length; i++){
        if (n[n.length-1] === o[i]) return true;
    }
    return false;
}

//Number functions
//n = user subimitted, o = actual number
function checkNumber(n, o){
    switch(true){
        case n == o:
            return 1;
        case n > o-10 || n < o+10:
            return 2;
        default:
            return 3;
    }
}

function hintNumber(n) {
    if (n > 50) return("Here's your hint. The number is between 51 and 101");
    else return("Here's your hint. The number is betweeen 1 and 50");
}

function newNumber(n) {
    return Math.floor(Math.random()*100)+1;
}