"""
CogServer connection and communication handling.

Provides WebSocket and TCP connectivity to OpenCog's CogServer,
command execution, and real-time knowledge synchronization.
"""

import asyncio
import websockets
import socket
import json
import logging
from typing import Dict, Any, Optional, Callable, Union, List
from dataclasses import dataclass
from enum import Enum

from .translation import AtomeseAtom


class ConnectionType(Enum):
    TCP = "tcp"
    WEBSOCKET = "websocket"


@dataclass
class CogServerConfig:
    """Configuration for CogServer connection."""
    host: str = "localhost"
    port: int = 17001
    connection_type: ConnectionType = ConnectionType.TCP
    timeout: int = 5
    reconnect_attempts: int = 5
    reconnect_delay: int = 1


class CogServerConnector:
    """Handles connection and communication with OpenCog CogServer."""
    
    def __init__(self, config: CogServerConfig):
        self.config = config
        self.connection = None
        self.is_connected = False
        self.message_handlers = {}
        self.logger = logging.getLogger(__name__)
    
    async def connect(self) -> bool:
        """Establish connection to CogServer."""
        try:
            if self.config.connection_type == ConnectionType.WEBSOCKET:
                await self._connect_websocket()
            else:
                await self._connect_tcp()
            
            self.is_connected = True
            self.logger.info(f"Connected to CogServer at {self.config.host}:{self.config.port}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to connect to CogServer: {e}")
            self.is_connected = False
            return False
    
    async def _connect_websocket(self):
        """Connect via WebSocket."""
        uri = f"ws://{self.config.host}:{self.config.port}"
        self.connection = await websockets.connect(
            uri, 
            timeout=self.config.timeout
        )
    
    async def _connect_tcp(self):
        """Connect via TCP socket."""
        self.connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.connection.settimeout(self.config.timeout)
        await asyncio.get_event_loop().run_in_executor(
            None, 
            self.connection.connect, 
            (self.config.host, self.config.port)
        )
    
    async def disconnect(self):
        """Close connection to CogServer."""
        if self.connection:
            try:
                if isinstance(self.connection, websockets.WebSocketServerProtocol):
                    await self.connection.close()
                else:
                    self.connection.close()
            except Exception as e:
                self.logger.error(f"Error during disconnect: {e}")
            
            self.connection = None
            self.is_connected = False
            self.logger.info("Disconnected from CogServer")
    
    async def send_command(self, command: str) -> Optional[str]:
        """Send a command to CogServer and return the response."""
        if not self.is_connected or not self.connection:
            raise ConnectionError("Not connected to CogServer")
        
        try:
            message = {
                "id": self._generate_id(),
                "type": "command",
                "command": command
            }
            
            if isinstance(self.connection, websockets.WebSocketServerProtocol):
                await self.connection.send(json.dumps(message))
                response = await self.connection.recv()
                return json.loads(response).get("result", "")
            else:
                # TCP connection
                data = json.dumps(message).encode() + b'\n'
                await asyncio.get_event_loop().run_in_executor(
                    None, self.connection.send, data
                )
                
                response = await asyncio.get_event_loop().run_in_executor(
                    None, self.connection.recv, 4096
                )
                return json.loads(response.decode()).get("result", "")
                
        except Exception as e:
            self.logger.error(f"Command execution failed: {e}")
            raise
    
    async def execute_scheme(self, scheme_expr: str) -> Any:
        """Execute a Scheme expression in the CogServer."""
        command = f"(cog-execute! {scheme_expr})"
        result = await self.send_command(command)
        return self._parse_scheme_result(result)
    
    async def add_atom(self, atom: AtomeseAtom) -> str:
        """Add an atom to the AtomSpace."""
        scheme_expr = self._atom_to_scheme(atom)
        return await self.execute_scheme(scheme_expr)
    
    async def query_atoms(self, pattern: str) -> List[AtomeseAtom]:
        """Query atoms matching a pattern."""
        command = f"(cog-get-atoms '{pattern})"
        result = await self.send_command(command)
        return self._parse_atom_list(result)
    
    def _atom_to_scheme(self, atom: AtomeseAtom) -> str:
        """Convert AtomeseAtom to Scheme expression."""
        if atom.name:
            scheme = f"({atom.atom_type.value} \"{atom.name}\")"
        elif atom.outgoing:
            outgoing_scheme = " ".join(
                self._atom_to_scheme(child) for child in atom.outgoing
            )
            scheme = f"({atom.atom_type.value} {outgoing_scheme})"
        else:
            scheme = f"({atom.atom_type.value})"
        
        if atom.truth_value:
            tv = f"(stv {atom.truth_value.strength} {atom.truth_value.confidence})"
            scheme = f"(cog-set-tv! {scheme} {tv})"
        
        return scheme
    
    def _parse_scheme_result(self, result: str) -> Any:
        """Parse Scheme evaluation result."""
        # Simplified parsing - in real implementation would use proper parser
        if result.startswith("(") and result.endswith(")"):
            return result
        return result.strip()
    
    def _parse_atom_list(self, result: str) -> List[AtomeseAtom]:
        """Parse list of atoms from Scheme result."""
        # Simplified parsing - in real implementation would use proper Atomese parser
        atoms = []
        # This would contain actual parsing logic
        return atoms
    
    def _generate_id(self) -> str:
        """Generate unique message ID."""
        import uuid
        return str(uuid.uuid4())
    
    def on_message(self, message_type: str, handler: Callable):
        """Register message handler for specific message types."""
        self.message_handlers[message_type] = handler
    
    async def start_listening(self):
        """Start listening for messages from CogServer."""
        if not self.is_connected:
            return
        
        try:
            while self.is_connected:
                if isinstance(self.connection, websockets.WebSocketServerProtocol):
                    message = await self.connection.recv()
                    await self._handle_message(json.loads(message))
                else:
                    # TCP message handling
                    data = await asyncio.get_event_loop().run_in_executor(
                        None, self.connection.recv, 4096
                    )
                    if data:
                        await self._handle_message(json.loads(data.decode()))
                    else:
                        break
                        
        except Exception as e:
            self.logger.error(f"Error in message listening: {e}")
            self.is_connected = False
    
    async def _handle_message(self, message: Dict[str, Any]):
        """Handle incoming message from CogServer."""
        message_type = message.get("type", "unknown")
        if message_type in self.message_handlers:
            await self.message_handlers[message_type](message)