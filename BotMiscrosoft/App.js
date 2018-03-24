/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
    StyleSheet,
    TextInput,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    FlatList,
    Image,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import Voice from 'react-native-voice';
import AutoScroll from 'react-native-auto-scroll';

let width = Dimensions.get('window').width; //full width
let height = Dimensions.get('window').height; //full height
let token = 'Bearer aDgDHJDvtXQ.cwA.5iM.7dg1yBydyqmtqOSZbjdmgDm7XU_6uSnY5sguq6fc0W8';

class App extends Component {

    constructor() {
        super();
        this.state = {
            response: "",
            buttonResponse: "",
            nbMsg: 0,
            msgApi: 0,
            idConversation: "",
            conversation: [],
            loading: true,
            recognized: '',
            pitch: '',
            error: '',
            end: '',
            started: '',
            results: [],
            partialResults: [],
        };
        Voice.onSpeechStart = this.onSpeechStart.bind(this);
        Voice.onSpeechRecognized = this.onSpeechRecognized.bind(this);
        Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
        Voice.onSpeechError = this.onSpeechError.bind(this);
        Voice.onSpeechResults = this.onSpeechResults.bind(this);
        Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
        Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged.bind(this);
    }

    componentWillUnmount() {
        Voice.destroy().then(Voice.removeAllListeners);
    }

    onSpeechStart(e) {
        this.setState({
            started: '√',
        });
    }
    onSpeechRecognized(e) {
        this.setState({
            recognized: '√',
        });
    }
    onSpeechEnd(e) {
        this.setState({
            end: '√',
        });
    }
    onSpeechError(e) {
        this.setState({
            error: JSON.stringify(e.error),
        });
    }
    onSpeechResults(e) {
        this.setState({
            results: e.value,
        });
    }
    onSpeechPartialResults(e) {
        this.setState({
            partialResults: e.value,
        });
    }
    onSpeechVolumeChanged(e) {
        this.setState({
            pitch: e.value,
        });
    }

    async _startRecognizing(e) {
        if (this.state.started === "") {
            Alert.alert(
                "Enregistrement en cours..",
                "Appuyer sur STOP pour finir l'enregistrement",
                [
                    {text: 'Stop', onPress: () => {this._startRecognizing(e)}},
                    {text: 'Annuler', onPress: () => {this._destroyRecognizer()}},
                ]
            )
            this.setState({
                recognized: '',
                pitch: '',
                error: '',
                started: '',
                results: [],
                partialResults: [],
                end: ''
            });
            try {
                await Voice.start('fr-FR');
            } catch (e) {
                console.error(e);
            }
        }
        else {
            this._stopRecognizing(e);
            if (this.state.partialResults.length === 0 || this.state.partialResults[0] === "")
                Alert.alert(
                    "Erreur",
                    "L'enregistrement n'a pas pu être effectué"
                    )
            else
                this._appendHumanAnswer(this.state.partialResults[0]);
            this._destroyRecognizer(e)
        }
    }
    async _stopRecognizing(e) {
        try {
            await Voice.stop();
        } catch (e) {
            console.error(e);
        }
    }
    async _cancelRecognizing(e) {
        try {
            await Voice.cancel();
        } catch (e) {
            console.error(e);
        }
    }
    async _destroyRecognizer(e) {
        try {
            await Voice.destroy();
        } catch (e) {
            console.error(e);
        }
        this.setState({
            recognized: '',
            pitch: '',
            error: '',
            started: '',
            results: [],
            partialResults: [],
            end: ''
        });
    }

    componentDidMount() {
        fetch("https://directline.botframework.com/api/conversations", {
            method: 'POST',
            headers: {
                Authorization: token,
            }})
            .then((response) => response.json())
            .then((responseData) => {
                this.setState({
                    idConversation: responseData.conversationId,
                    loading: false
                })
            })
            .done();
    }
    _getBotAnswer = () => {
        fetch("https://directline.botframework.com/api/conversations/"+this.state.idConversation+"/messages", {
            headers: {
                Authorization: token,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })
            .then((response) => response.json())
            .then((responseJson) => {
                if (responseJson.messages.length === this.state.nbMsg) {
                    this._getBotAnswer();
                }
                else {
                    var msg = this.state.nbMsg;
                    while (msg < responseJson.messages.length) {
                        if (this._isOptionBotAnswer(responseJson.messages[msg].text)) {
                            this._createChoice(responseJson.messages[msg].text);
                        }
                        this._apprendBotAnswer(responseJson.messages[msg].text);
                        msg++;
                    }
                }
            })
            .done();
    }
    _sendHumanAnswer = (answer) => {
        fetch("https://directline.botframework.com/api/conversations/"+this.state.idConversation+"/messages", {
            method: 'POST',
            headers: {
                Authorization: token,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: answer,
                user: 'Human',
            }),
        })
            .then(() => {
                this._getBotAnswer()
            })
            .done();
    }
    _apprendBotAnswer = (answer) => {
        this.setState({nbMsg: this.state.nbMsg+=1});
        var conversationPush = this.state.conversation.slice();
        conversationPush.push({key: this.state.nbMsg, msg: answer, from: "Bot"});
        this.setState({
            conversation: conversationPush,
        });
    }
    _appendHumanAnswer = (buttonValue) => {
        this.setState({ nbMsg: this.state.nbMsg+=1 });
        var conversationPush = this.state.conversation.slice();
        conversationPush.push({key: this.state.nbMsg, msg: buttonValue, from: "Human"});
        this._sendHumanAnswer(buttonValue);
        this.setState({
            conversation: conversationPush,
            response: ""
        });
    }
    _createChoice = (msg) => {
        var find = "";
        var len =  (msg.match(/\*/g) || []).length;
        if (len) {
            var i = 1;
            while (i < len) {
                find += "(\\*\\s(.+)\\s+)";
                i++;
            }
            find += "(\\*\\s(.+))";
        }
        var result = msg.match(find);
        result.splice(0, 1);
        i = 0;
        while (i < len) {
            result.splice(i, 1);
            i++;
        }
        j = 0;
        while (j < result.length) {
            if (result[j]) {
                var conversationPush = this.state.conversation.slice();
                conversationPush.push({key: this.state.nbMsg, msg: msg, value: result[j], from: "Bot"});
                this.setState({
                    conversation: conversationPush,
                });
            }
            j++;
        }
    }
    _isOptionBotAnswer = (msg) => {
        if (/Options:/.test(msg))
            return true;
        return false;
    }
    _isHuman = (from) => {
        if (from === "Human")
            return true;
        return false;
    }
    _isShowMicro = () => {
        if (this.state.response.length > 0)
            return true;
        else
            return false;
    }
    _microSelectPlateform = () => {
        if (Platform.OS === 'ios')
            return require('./public/micro.psd');
        return require('./public/micro.png');
    }


    render() {
        if (!this.state.loading)
            return (
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.Sami}>Sami</Text>
                    </View>
                    <AutoScroll>
                        <View>
                            <FlatList
                                data={this.state.conversation}
                                renderItem={({item}) =>
                                    this._isHuman(item.from) &&
                                    <View style={styles.viewTextHumanAnswer}>
                                        <Text style={styles.textAnswer}>{item.msg}</Text>
                                    </View> ||
                                    !this._isHuman(item.from) && !this._isOptionBotAnswer(item.msg) &&
                                    <View style={styles.viewTextBotAnswer}>
                                        <Text style={styles.textAnswer}>{item.msg}</Text>
                                    </View> ||
                                    !this._isHuman(item.from) && this._isOptionBotAnswer(item.msg) &&
                                    item.value &&
                                    <TouchableOpacity onPress={() => this._appendHumanAnswer(item.value)}>
                                        <View style={styles.viewTextHumanButtonAnswer}>
                                            <Text style={styles.textButtonAnswer}>{item.value}</Text>
                                        </View>
                                    </TouchableOpacity>

                                }
                            />
                        </View>
                    </AutoScroll>
                    <View style={styles.footer}>
                        <TextInput style={styles.inputAnswer} underlineColorAndroid='transparent' placeholder='Envoyer un message'
                                   onChangeText={(response) => this.setState({response})} value={this.state.response}/>
                        {
                            !this._isShowMicro() &&
                            <TouchableOpacity onPress={this._startRecognizing.bind(this)}>
                                <View style={styles.buttonAnswer}>
                                    <Image style={styles.imgMicro} source={this._microSelectPlateform()}/>
                                </View>
                            </TouchableOpacity>
                                ||
                            this._isShowMicro() &&
                            <TouchableOpacity onPress={() => this._appendHumanAnswer(this.state.response)}>
                                <View style={styles.buttonAnswer}>
                                    <Text style={styles.textButtonAnswer}>Envoyer</Text>
                                </View>
                            </TouchableOpacity>

                        }
                    </View>
                </View>
            );
        else
            return (
                <View style={styles.center}>
                    <ActivityIndicator style={styles.activity}/>
                    <Text>Loading...</Text>
                </View>
            );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    activity: {
        marginTop: height/2,
        marginBottom: 5
    },
    header: {
        height: height/12,
        backgroundColor: '#F2F2F2',
        alignItems: 'center',
        justifyContent: 'center'
    },
    Sami: {
        color: '#000000',
        fontSize: 30,
        fontWeight: 'bold'
    },
    footer: {
        height: height/12,
        flexDirection: 'row',
        backgroundColor: '#F2F2F2',
    },
    inputAnswer: {
        flex: 1,
        width: width-(width/4),
        fontSize: 20,
        marginLeft: 10,
    },
    buttonAnswer: {
        flex: 1,
        backgroundColor: '#F5D0A9',
        width: width/4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textButtonAnswer: {
        fontSize: 20,
        color: '#FFFFFF'
    },
    textAnswer: {
        fontSize: 18,
        color: '#FFFFFF'
    },
    viewTextBotAnswer: {
        backgroundColor: "#F7BE81",
        borderRadius: 5,
        margin: width/20,
        marginRight: width/5,
        padding: width/20,
    },
    viewTextHumanAnswer: {
        backgroundColor: "#BDBDBD",
        borderRadius: 5,
        margin: width/20,
        marginLeft: width/5,
        padding: width/20,
    },
    viewTextHumanButtonAnswer: {
        backgroundColor: "#F5D0A9",
        borderRadius: 5,
        marginLeft: width/20,
        marginBottom: width/60,
        marginRight: width/5,
        padding: width/40,
    },
    textButtonAnswer: {
        fontSize: 18,
        color: '#FFFFFF'
    },
    imgMicro: {
        width: width/18,
        height: height/20,
    }
});

export default App