const axios = require('axios')

const functions = require('firebase-functions')

const admin = require('firebase-admin')
admin.initializeApp()

const firestore = admin.firestore()
firestore.settings({timestampsInSnapshots: true})
// exports.addStudent = functions.https.onCall(async (req, res) => {

// 	const studentUid = req.query.uid
// 	const questionID = req.query.questionID
// 	const questions = firestore.collection('questions')
// 	const userDoc = await firestore.doc('/users/' + studentUid).get()
// 	const displayName = userDoc.data().displayName

// 	return questions.where('questionID', '==', questionID).onSnapshot(snapshot => {
// 		var data = snapshot.docs[0].data()
// 		if (!data.users) {
// 			data.users = []
// 		}
// 		if (!data.users.find(u => u.uid == studentUid)) {
// 			data.users.push({
// 				displayName: displayName, 
// 				finished: false, 
// 				retired: false, 
// 				uid: studentUid,
// 				teacher: null
// 			      })
// 			snapshot.docs[0].ref.set(data)
// 		}
// 		console.log('finished')
// 	})
// })

// exports.addTeacher = functions.https.onCall(async (req, res) => {
// 	const teacherUid = req.query.uid
// 	const questionID = req.query.questionID
// 	const questions = firestore.collection('questions')
// 	const userDoc = await firestore.doc('/users/' + teacherUid).get()
// 	const displayName = userDoc.data().displayName;

// 	return questions.where('questionID', '==', questionID).onSnapshot(snapshot => {
// 		var data = snapshot.docs[0].data()
// 		var matchingUser = data.users.find(u => u.uid == teacherUid)
// 		if (matchingUser.finished == false) {
// 			data.users.splice(data.users.indexOf(matchingUser[0]), 1)
// 			data.users.push({
// 				displayName: displayName, 
// 				finished: true, 
// 				retired: false, 
// 				uid: teacherUid,
// 				student: null
// 			      })
// 			snapshot.docs[0].ref.set(data)
// 		}	
// 		else if (!matchingUser) {
// 			data.users.push({
// 				displayName: displayName, 
// 				finished: true, 
// 				retired: false, 
// 				uid: teacherUid,
// 				student: null
// 			      })
// 			snapshot.docs[0].ref.set(data)
// 		}
// 		console.log('finished')
// 	})
// })

exports.onStatusChange = functions.database.ref('/status/{uid}').onUpdate( async (change, context) => {
	const eventStatus = change.after.val()
	console.log(context.params.uid)
	const userFirestoreDoc = await firestore.doc('/users/' + context.params.uid).get()
	return change.after.ref.once('value').then(async latestSnapshot => {
		if (latestSnapshot.val().last_changed > eventStatus.last_changed) 
			return null;
		eventStatus.last_changed = new Date(eventStatus.last_changed);
		var data = userFirestoreDoc.data()
		data.isOnline = eventStatus.isOnline
		userFirestoreDoc.ref.set(data)
		console.log('finished')
	})
})
exports.notificationOnNewMessage = functions.firestore.document('/chatRooms/{roomID}').onUpdate((change, context) => {
	if(change.after.data().messages == change.before.data().messages)
		return;

	const roomID = context.params.roomID;

	const messages = change.after.data().messages
	const participants = change.after.data().participants
	const message = messages[messages.length - 1]
	const senderName = message.author.displayName
	const senderUid = message.author.uid
	var receiverUid = undefined
	if(participants[0].uid == senderUid) {
		receiverUid = participants[1].uid
	} else {
		receiverUid = participants[0].uid
	}
	firestore.doc('/users/' + receiverUid).get().then(async snapshot => {
		var receiverTokens = snapshot.data().tokens
		console.log(senderUid)
		console.log(snapshot.data())
		console.log(receiverTokens)
		if(!receiverTokens) {
			return;
		}
		receiverTokens.forEach(function(token) {
			const payload = {
				notification : {
					title: senderName + ' sent you a message...',
					body: message.content,
					click_action: 'https://feynman.online',
					sound: 'default'
				},
				to: token
			}
			const headers = {
				'Content-type': 'application/json',
				'Authorization': 'key=AAAATwegD0Q:APA91bFqyN3LVqEtnEz829qCo-lynOl_5bvjc0knD4GBJm7p8I6K7ieo48DMJZgTYOJ5ceRVnZcxA5KAIoDYr3mkN9ad2752DfOG57hYt4h98PUU94TrZPclzMq239xdZ9gkZH9xBYHk'
			}
			axios.create({
				headers
			})
			.post('https://fcm.googleapis.com/fcm/send', payload)
			.then(response => console.log(response.statusText))
			.catch(error => console.log(error))
		})
	})
	return null;
})
