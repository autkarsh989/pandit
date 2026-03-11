from dtor import TorHandler
import time

LOCAL_PORT = 3000

handler = TorHandler(recover=False)

# Auto download tor binaries
handler.download_and_install_tor_binaries()

# Configure ports
handler.add_socks_port(9050)
handler.add_control_port(9051)

# Start Tor
handler.start_tor_service()

# Create onion reverse tunnel
result = handler.register_runtime_hidden_service(
    port=80,
    target_port=LOCAL_PORT,
    temporary=False
)

print("Onion address:", result["onion_address"])
print("Forwarding -> localhost:", LOCAL_PORT)

while True:
    time.sleep(60)