package software.momento.kotlin.moderatedchat

import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.yield
import org.json.JSONObject
import software.momento.kotlin.moderatedchat.ui.theme.ModeratedChatTheme
import software.momento.kotlin.sdk.CacheClient
import software.momento.kotlin.sdk.TopicClient
import software.momento.kotlin.sdk.auth.CredentialProvider
import software.momento.kotlin.sdk.config.Configurations
import software.momento.kotlin.sdk.config.TopicConfigurations
import software.momento.kotlin.sdk.responses.cache.GetResponse
import software.momento.kotlin.sdk.responses.cache.SetResponse
import software.momento.kotlin.sdk.responses.topic.TopicMessage
import software.momento.kotlin.sdk.responses.topic.TopicPublishResponse
import software.momento.kotlin.sdk.responses.topic.TopicSubscribeResponse
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.URL
import java.net.URLEncoder
import java.util.Base64
import java.util.Locale
import java.util.UUID
import javax.net.ssl.HttpsURLConnection
import kotlin.collections.HashMap
import kotlin.system.exitProcess
import kotlin.time.Duration.Companion.seconds

const val baseApiUrl = "https://your-api-endpoint.com"
var momentoApiToken: String = ""
var tokenExpiresAt: Long = 0
var topicClient: TopicClient? = null
var cacheClient: CacheClient? = null

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // TODO: temporarily locking orientation to prevent messages from
        //  disappearing when it's changed. Remove when message list is
        //  "rememberSaveable"d
        this.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        setContent {
            ModeratedChatTheme {
                // A surface container using the 'background' color from the theme
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ModeratedChatApp()
                }
            }
        }
    }
}

data class ChatUser(
    val name: String,
    val id: String
)

data class ChatMessage(
    val timestamp: Long,
    val messageType: String,
    val message: String,
    val sourceLanguage: String,
    val user: ChatUser
)

@Composable
fun ModeratedChatApp(modifier: Modifier = Modifier) {
    var userName by rememberSaveable { mutableStateOf("") }
    val userId by rememberSaveable { mutableStateOf(UUID.randomUUID()) }
    if (userName.isBlank()) {
        ModeratedChatLogin(
            {
                userName = it
            }
        )
    } else {
        ModeratedChatLayout(
            userName = userName,
            userId = userId,
            modifier = modifier
        )
    }
}

@Composable
fun ModeratedChatLogin(
    onLogin: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        var userNameField by remember { mutableStateOf("") }
        Image(
            painterResource(id = R.drawable.mochat_mo_peek_up),
            contentDescription = null
        )
        Text(
            text = "Welcome to Momento Moderated Chat!",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Spacer(modifier = Modifier.height(16.dp))
        TextField(
            value = userNameField,
            label = { Text("Choose your username...") },
            singleLine = true,
            onValueChange = {
                userNameField = it
            }
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            modifier = modifier,
            onClick = { onLogin(userNameField.trim()) },
        ) {
            Text("Continue")
        }
    }
}

@Composable
fun ModeratedChatLayout(
    userName: String,
    userId: UUID,
    modifier: Modifier = Modifier
) {
    var supportedLanguages by rememberSaveable { mutableStateOf(mapOf("xx" to "Loading...")) }
    var currentLanguage by rememberSaveable { mutableStateOf("xx") }
    val currentMessages = remember { mutableStateListOf<ChatMessage>() }
    var subscribeJob by remember { mutableStateOf<Job?>(null) }
    var messagesLoaded by remember { mutableStateOf(false) }
    var loadError by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    if (loadError) {
        LoadError(subscribeJob = subscribeJob)
        return
    }

    Column(
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row (
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF25392B))
        ) {
            Spacer(modifier = Modifier.width(8.dp))
            Image(
                painterResource(id = R.drawable.mochat_mo_peek_up),
                contentDescription = null,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Welcome to Momento Chat!",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            LanguageDropdown(
                languages = supportedLanguages,
                onLanguagesLoad = {
                    supportedLanguages = it
                },
                onLanguageLoadError = {
                    loadError = true
                },
                language = currentLanguage,
                onLanguageChange = { newLanguage ->
                    println("onLanguage change: $currentLanguage -> $newLanguage")
                    // TODO: not sure how much of this is necessary, but the withContext def is
                    scope.launch {
                        withContext(Dispatchers.IO) {
                            coroutineScope {
                                launch {
                                    try {
                                        val tokenExpiresInSecs =
                                            tokenExpiresAt - (System.currentTimeMillis() / 1000)
                                        println("token expires in $tokenExpiresInSecs")
                                        if (topicClient == null || tokenExpiresInSecs < 10) {
                                            getClients(userName, userId)
                                        }
                                    } catch (e: Exception) {
                                        loadError = true
                                    }
                                }
                            }
                            if (currentLanguage == newLanguage) {
                                println("language $currentLanguage not changed. skipping.")
                                return@withContext
                            }
                            messagesLoaded = false
                            currentLanguage = newLanguage
                            println("language changed to $currentLanguage")
                            currentMessages.clear()
                            try {
                                getMessagesForLanguage(languageCode = currentLanguage) {
                                    for (i in 0..<it.count()) {
                                        currentMessages.add(it[i])
                                    }
                                }
                            } catch (e: Exception) {
                                loadError = true
                            }
                            messagesLoaded = true
                            if (subscribeJob != null) {
                                subscribeJob!!.cancelAndJoin()
                            }
                            while (true) {
                                subscribeJob = launch {
                                    try {
                                        topicSubscribe(language = currentLanguage)
                                        {
                                            // Previously, we were adding the just-received message directly
                                            // but this caused duplicate messages to appear when switching
                                            // languages very soon after. This may be due to the sequence page
                                            // change, prompting the topic to send the last message(s) again.
                                            // Let's just fetch the authoritative list of messages from the
                                            // translation service instead.
                                            getMessagesForLanguage(languageCode = currentLanguage) {
                                                for (i in 0..<it.count()) {
                                                    currentMessages.add(it[i])
                                                }
                                            }
                                        }
                                    } catch (e: RuntimeException) {
                                        // TODO: getting a RuntimeException about grpc channel not
                                        //  being closed correctly.
                                    } catch (e: Exception) {
                                        loadError = true
                                    }

                                }
                                val resubscribeAfterSecs = 180L
                                delay(resubscribeAfterSecs * 1000)
                                // resubscribe after delay
                                subscribeJob?.cancelAndJoin()
                                getClients(userName, userId)
                            }
                        }
                    }
                },
                modifier = modifier.fillMaxWidth(),
            )
        }
        
        if (currentMessages.size == 0)
            if (!messagesLoaded) {
                Text(
                    text = "Loading messages . . . ",
                    color = Color.White,
                    modifier = modifier.weight(1f)
                )
            } else {
                Text(
                    text = "There are no messages in the chat. Send a message to get started!",
                    modifier = modifier.weight(1f)

                )
        } else {
            MessageList(
                currentUserId = userId,
                messages = currentMessages,
                modifier = Modifier
                    .weight(1f)
                    .padding(4.dp)
            )
        }
        MessageBar(
            userName = userName,
            userId = userId,
            currentLanguage = currentLanguage,
            modifier = modifier
        )

    }
}

@Composable
fun MessageBar(
    userName: String,
    userId: UUID,
    currentLanguage: String,
    modifier: Modifier = Modifier
) {
    var message by remember { mutableStateOf("") }
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    var imageBytes by remember { mutableStateOf<ByteArray?>(null) }
    var showImageSizeError by remember { mutableStateOf(false) }
    var showPublishError by remember { mutableStateOf(false) }
    val imageScope = rememberCoroutineScope()
    val context = LocalContext.current

    val focusManager = LocalFocusManager.current
    val launcher = rememberLauncherForActivityResult(
        contract = object: ActivityResultContracts.GetContent() {
            override fun createIntent(context: Context, input: String): Intent {
                return super
                    .createIntent(context, input)
                    .putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/png", "image/jpg", "image/jpeg"))
            }
        }
    ) { uri: Uri? ->
        imageUri = uri
        if (imageUri != null) {
            val item = context.contentResolver.openInputStream(imageUri!!)
            imageBytes = item?.readBytes()
            item?.close()
            if (imageBytes != null && imageBytes!!.size > 1_000_000) {
                imageScope.launch {
                    coroutineScope {
                        showImageSizeError = true
                    }
                }
                return@rememberLauncherForActivityResult
            }
            imageScope.launch {
                withContext(Dispatchers.IO) {
                    val imageId = "image-${UUID.randomUUID()}"
                    val imageData = Base64.getEncoder().encodeToString(imageBytes)
                    val imageSetResponse = cacheClient?.set(
                        "moderator", imageId, imageData
                    )
                    when (imageSetResponse) {
                        is SetResponse.Error -> println("ERROR: ${imageSetResponse.message}")
                        is SetResponse.Success -> println("Successfully set image in cache")
                        else -> println("Unknown error: $imageSetResponse")
                    }
                    publishMessage(
                        userName = userName,
                        userId = userId,
                        messageType = "image",
                        chatMessage = imageId,
                        onPublishError = { showPublishError = true },
                        currentLanguage = currentLanguage
                    )
                }
            }
        }
    }

    Row(
        modifier = Modifier
            .padding(horizontal = 8.dp, vertical = 4.dp)
            .height(60.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (showImageSizeError) {
            LaunchedEffect(showImageSizeError) {
                delay(2_000)
                showImageSizeError = false
            }
            Text(
                text = "Error: Image must be below 1MB",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error
            )
        } else if (showPublishError) {
            LaunchedEffect(showPublishError) {
                delay(2_000)
                showPublishError = false
            }
            Text(
                text = "Error publishing message, please try again",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error
            )
        } else {
            TextField(
                value = message,
                onValueChange = { message = it },
                label = { Text(text = "Type your message...") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                modifier = modifier
                    .weight(1f)
                    .padding(4.dp)
            )
            TextButton(
                onClick = {
                    launcher.launch("image/*")
                }
            ) {
                Image(
                    painter = painterResource(id = R.drawable.attach),
                    contentDescription = "Upload Image",
                    modifier = Modifier.size(40.dp)
                )
            }
            TextButton(
                onClick = {
                    if (message.isEmpty()) {
                        return@TextButton
                    }
                    focusManager.clearFocus()
                    // copy message value to send to publish
                    val publishMessage = message.trim()
                    imageScope.launch {
                        publishMessage(
                            userName = userName,
                            userId = userId,
                            currentLanguage = currentLanguage,
                            onPublishError = {
                                showPublishError = true
                            },
                            chatMessage = publishMessage
                        )
                    }
                    message = ""
                },
            ) {
                Image(
                    painter = painterResource(id = R.drawable.send),
                    contentDescription = "Send",
                    modifier = Modifier.size(40.dp)
                )
            }
        }
    }
}

@Composable
fun MessageList(
    currentUserId: UUID,
    messages: List<ChatMessage>,
    modifier: Modifier = Modifier
) {
    val lazyColumnListState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LazyColumn(
        state = lazyColumnListState,
        modifier = modifier
    ) {
        items(items = messages) { item ->
            key(item.message) {
                ChatEntry(
                    currentUserId = currentUserId,
                    message = item,
                    onLoad = {
                        if (
                            !lazyColumnListState.isScrollInProgress
                            && !lazyColumnListState.canScrollForward
                        ) {
                            scope.launch {
                                lazyColumnListState.scrollToItem(messages.count())
                            }
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun ChatEntry(
    currentUserId: UUID,
    message: ChatMessage,
    onLoad: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isCurrentUser = currentUserId.toString() == message.user.id
    val color = if (isCurrentUser) {
        Color(0xFF00C88C)
    } else {
        Color(0xFFE1D9D5)
    }

    val sdf = java.text.SimpleDateFormat("HH:mm a", Locale.US)
    val parsedDate = sdf.format(java.util.Date(message.timestamp))
    var imageBytes by remember { mutableStateOf<ByteArray?>(null) }
    LaunchedEffect(message.message) {
        if (message.messageType == "image") {
            if (message.message.startsWith("image-")) {
                when (val getResponse = cacheClient?.get("moderator", message.message)) {
                    is GetResponse.Error -> println("Error getting image: $getResponse")
                    is GetResponse.Miss -> println("Cache miss g=fetching key ${message.message}")
                    is GetResponse.Hit -> imageBytes = Base64.getDecoder().decode(getResponse.value)
                    null -> println("get null response for image")
                }
            } else {
                imageBytes = Base64.getDecoder().decode(message.message)
            }
        }
    }

    Surface(
        color = color,
        shape = RoundedCornerShape(8.dp),
        modifier = modifier
            .padding(4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = message.user.name,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = parsedDate,
                    color = Color.Black
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            if (message.messageType == "text") {
                Text(
                    text = message.message,
                    modifier = modifier.padding(horizontal = 5.dp),
                    onTextLayout = { onLoad() },
                    color = Color.Black
                )
            } else {
                val bytes = imageBytes
                val request = ImageRequest.Builder(context = LocalContext.current)
                    .data(bytes)
                    .build()
                AsyncImage(
                    model = request,
                    contentDescription = null,
                    modifier = modifier.padding(4.dp),
                    onSuccess = { onLoad() }
                )
            }
        }
    }
}


@Composable
fun LanguageDropdown(
    languages: Map<String, String>,
    onLanguagesLoad: (Map<String, String>) -> Unit,
    onLanguageLoadError: () -> Unit,
    language: String,
    onLanguageChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var menuExpanded by remember { mutableStateOf(false) }
    LaunchedEffect(languages) {
        withContext(Dispatchers.IO) {
            try {
                onLanguagesLoad(getSupportedLanguages())
            } catch (e: Exception) {
                onLanguageLoadError()
            }
            onLanguageChange("en")
        }
    }
    Box(
        modifier = modifier
            .fillMaxWidth()
            .wrapContentSize(Alignment.TopEnd)
            .padding(8.dp)
    ) {
        TextButton(
            onClick = { menuExpanded = !menuExpanded },
        ) {
            Text(text = languages[language] ?: "Loading...", color = Color.White)
            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color.White)
        }
        DropdownMenu(
            expanded = menuExpanded,
            onDismissRequest = {
                menuExpanded = false
            }
        ) {
            for (languageItem in languages.entries.iterator()) {
                DropdownMenuItem(
                    text = { Text(languageItem.value) },
                    onClick = {
                        onLanguageChange(languageItem.key)
                        menuExpanded = false
                    }
                )
            }
        }
    }
}

@Composable
fun LoadError(
    subscribeJob: Job?
) {
    val scope = rememberCoroutineScope()
    topicClient?.close()
    cacheClient?.close()
    LaunchedEffect(true) {
        if (subscribeJob != null) {
            scope.launch {
                subscribeJob.cancelAndJoin()
            }
        }
    }
    Column (
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(
            painterResource(id = R.drawable.mochat_mo_peek_up),
            contentDescription = null
        )
        Text(
            text = "Error loading application data.",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = "Please check your network settings and try again."
        )
        Button(
            onClick = { exitProcess(1) }
        ) {
            Text(text = "Exit")
        }
    }
}

suspend fun topicSubscribe(
    language: String,
    onMessage: (String) -> Unit
) {
    println("Subscribing to chat-$language with $topicClient")
    if (topicClient == null) {
        throw RuntimeException("Unable to load topic client.")
    }
    when (val response = topicClient!!.subscribe("moderator", "chat-$language")) {
        is TopicSubscribeResponse.Subscription -> coroutineScope {
            val subscribeBeginSecs = System.currentTimeMillis() / 1000
            launch {
                response.collect { item ->
                    yield()
                    when (item) {
                        is TopicMessage.Text -> {
                            onMessage(item.value)
                        }
                        is TopicMessage.Binary -> {
                            onMessage("${item.value}")
                        }
                        is TopicMessage.Error -> throw RuntimeException(
                            "An error occurred reading messages from topic 'test-topic': ${item.errorCode}", item
                        )
                    }
                }
            }
        }

        is TopicSubscribeResponse.Error -> throw RuntimeException(
            "An error occurred while attempting to subscribe to topic 'test-topic': ${response.errorCode}", response
        )
    }
}

private fun getApiToken(username: String, id: UUID) {
    val apiUrl = "$baseApiUrl/v1/translate/token"
    var reqParams = URLEncoder.encode("username", "UTF-8") + "=" + URLEncoder.encode(username, "UTF-8")
    reqParams += "&" + URLEncoder.encode("id", "UTF-8") + "=" + URLEncoder.encode(id.toString(), "UTF-8")
    val url = URL(apiUrl)

    with (url.openConnection() as HttpsURLConnection) {
        requestMethod = "POST"
        val wr = OutputStreamWriter(outputStream)
        wr.write(reqParams)
        wr.flush()

        BufferedReader(InputStreamReader(inputStream)).use {
            val response = StringBuffer()

            var inputLine = it.readLine()
            while (inputLine != null) {
                response.append(inputLine)
                inputLine = it.readLine()
            }
            val jsonObject = JSONObject(response.toString())
            momentoApiToken = jsonObject.getString("token")
            tokenExpiresAt = jsonObject.getLong("expiresAtEpoch")
        }
    }
}

private fun getClients(
    userName: String,
    userId: UUID
) {
    topicClient?.close()
    cacheClient?.close()

    getApiToken(userName, userId)
    val credentialProvider =
        CredentialProvider.fromString(momentoApiToken)
    topicClient = TopicClient(
        credentialProvider = credentialProvider,
        configuration = TopicConfigurations.Laptop.latest
    )
    cacheClient = CacheClient(
        credentialProvider = credentialProvider,
        configuration = Configurations.Laptop.latest,
        itemDefaultTtl = (24 * 60 * 60).seconds
    )
}

private fun getSupportedLanguages(): HashMap<String, String> {
    val supportedLanguages = HashMap<String, String>()
    val apiUrl = "$baseApiUrl/v1/translate/languages"
    val json = URL(apiUrl).readText()
    val jsonObject = JSONObject(json)
    val languages = jsonObject.getJSONArray("supportedLanguages")
    for (i in 0..<languages.length()) {
        val language = languages.getJSONObject(i)
        val value = language.getString("value")
        val label = language.getString("label")
        supportedLanguages[value] = label
    }
    return supportedLanguages
}

private fun getMessagesForLanguage(
    languageCode: String,
    onMessages: (List<ChatMessage>) -> Unit
) {
    println("Getting messages for $languageCode")
    val apiUrl = "$baseApiUrl/v1/translate/latestMessages/$languageCode"
    val messages = URL(apiUrl).readText()
    val jsonObject = JSONObject(messages)
    val messagesFromJson = jsonObject.getJSONArray("messages")
    val messageList = mutableListOf<ChatMessage>()
    for (i in 0..<messagesFromJson.length()) {
        val message =  messagesFromJson.getJSONObject(i)
        val parsedMessage = parseMessage(message = message)
        messageList.add(parsedMessage)
    }
    onMessages(messageList.toList())
}

private fun parseMessage(message: JSONObject): ChatMessage {
    val messageType = message.getString("messageType")
    val messageText = message.getString("message")
    val timestamp = message.getLong("timestamp")
    val sourceLanguage = message.getString("sourceLanguage")
    val authorJson = message.getJSONObject("user")
    val name = authorJson.getString("username")
    val id = authorJson.getString("id")
    return ChatMessage(
        user = ChatUser(
            name = name, id = id
        ),
        messageType = messageType,
        message = messageText,
        sourceLanguage = sourceLanguage,
        timestamp = timestamp
    )
}

private suspend fun publishMessage(
    userName: String,
    userId: UUID,
    currentLanguage: String,
    chatMessage: String,
    onPublishError: () -> Unit,
    messageType: String = "text"
) {
    val tokenExpiresInSecs = tokenExpiresAt - (System.currentTimeMillis() / 1000)
    if (tokenExpiresInSecs < 10) {
        withContext(Dispatchers.IO) {
            getClients(userName, userId)
        }
    }
    val gson = Gson()
    val user = ChatUser(name = userName, id = userId.toString())
    val message = ChatMessage(
        timestamp = System.currentTimeMillis(),
        message = chatMessage,
        messageType = messageType,
        sourceLanguage = currentLanguage,
        user = user
    )
    val jsonMessage = gson.toJson(message)
    println("sending json message: $jsonMessage")
    // TODO: figure out how to handle publish errors here
    val publishResponse = topicClient!!.publish(
        cacheName = "moderator",
        topicName = "chat-publish",
        value = jsonMessage
    )
    when (publishResponse) {
        is TopicPublishResponse.Success -> println("publish succeeded")
        is TopicPublishResponse.Error -> onPublishError()
    }
}
