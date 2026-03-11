import socket
import threading
import paramiko
import os
import pty
import select

KEY_FILE = "server_rsa.key"

# Auto-generate host key if it doesn't exist
if not os.path.exists(KEY_FILE):
    print("[*] Generating host key...")
    key = paramiko.RSAKey.generate(2048)
    key.write_private_key_file(KEY_FILE)

HOST_KEY = paramiko.RSAKey(filename=KEY_FILE)

USERNAME = "demo"
PASSWORD = "demo123"

class Server(paramiko.ServerInterface):

    def check_auth_password(self, username, password):
        if username == USERNAME and password == PASSWORD:
            return paramiko.AUTH_SUCCESSFUL
        return paramiko.AUTH_FAILED

    def get_allowed_auths(self, username):
        return "password"

    def check_channel_request(self, kind, chanid):
        if kind == "session":
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED

    def check_channel_shell_request(self, channel):
        return True

def handle_client(client):
    transport = paramiko.Transport(client)
    transport.add_server_key(HOST_KEY)
    server = Server()
    transport.start_server(server=server)

    channel = transport.accept(20)
    if channel is None:
        return

    # Spawn real bash shell
    pid, fd = pty.fork()
    if pid == 0:
        os.execvp("/bin/bash", ["/bin/bash"])

    while True:
        r, _, _ = select.select([channel, fd], [], [])
        if channel in r:
            data = channel.recv(1024)
            if not data:
                break
            os.write(fd, data)

        if fd in r:
            data = os.read(fd, 1024)
            if not data:
                break
            channel.send(data)

    channel.close()
    transport.close()

def start_server(port=2222):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("0.0.0.0", port))
    sock.listen(100)

    print(f"[*] SSH Server running on port {port}")

    while True:
        client, addr = sock.accept()
        print(f"[+] Connection from {addr}")
        threading.Thread(target=handle_client, args=(client,)).start()

if __name__ == "__main__":
    start_server()